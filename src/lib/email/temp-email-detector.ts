import { blockedEmailDomains, db, trustedEmailDomains } from "@/db";
import { eq, sql } from "drizzle-orm";

export class TempEmailDetector {
  // Comprehensive list of known temp email domains (you can expand this)
  private static knownTempDomains: Set<string> | null = null;
  // Domain patterns that are ALWAYS allowed (common providers)
  private static trustedDomains: Set<string> | null = null;
  // Patterns to detect temp email domains
  private static tempDomainPatterns = [
    // Time-based patterns (10minutemail, 24hourmail, etc.)
    /^\d+\s*(min(ute)?|hour|day|week|month|year)?mail\./i,

    // Common prefixes
    /^(temp|fake|spam|trash|junk|garbage|dummy|test|trial|demo|sample|example|placeholder)\.?/i,
    /^.*(temp|fake|spam|trash|junk|garbage|dummy|test|trial)mail\./i,

    // Disposable/throwaway indicators
    /^(disposable|throwaway|anonymous|incognito|secret|private|hidden|masked)\.?/i,
    /^.*(disposable|throwaway|anonymous|incognito)mail\./i,

    // Service patterns
    /^.*(guerrilla|shark|laser|nada|air|catch|moat|null)mail\./i,

    // Obvious spam indicators
    /^(spam|junk|trash|garbage|rubbish|waste)\./i,

    // Temporary indicators
    /^(tempo?r?ary|shortterm|brief|momentary)\.?/i,
  ];

  /**
   * Initialize with data from database
   */
  static async initialize() {
    if (this.knownTempDomains && this.trustedDomains) {
      return; // Already initialized
    }

    try {
      // Load blocked domains
      const blockedDomains = await db
        .select({ domain: blockedEmailDomains.domain })
        .from(blockedEmailDomains)
        .where(eq(blockedEmailDomains.isActive, true));

      this.knownTempDomains = new Set(blockedDomains.map(d => d.domain));

      // Load trusted domains
      const trustedDomains = await db
        .select({ domain: trustedEmailDomains.domain })
        .from(trustedEmailDomains)
        .where(eq(trustedEmailDomains.isActive, true));

      this.trustedDomains = new Set(trustedDomains.map(d => d.domain));

      console.log(`TempEmailDetector initialized with ${this.knownTempDomains.size} blocked domains and ${this.trustedDomains.size} trusted domains`);
    } catch (error) {
      console.error('Failed to initialize TempEmailDetector:', error);
      // Fallback to empty sets
      this.knownTempDomains = new Set();
      this.trustedDomains = new Set();
    }
  }

  /**
   * Check if email is from a temporary/disposable service
   */
  static async isTemporaryEmail(email: string): Promise<{ isTemp: boolean; reason?: string; confidence: number }> {
    // Ensure initialized
    if (!this.knownTempDomains || !this.trustedDomains) {
      await this.initialize();
    }

    try {
      const domain = this.extractDomain(email);
      if (!domain) {
        return { isTemp: true, reason: 'Invalid email format', confidence: 100 };
      }

      // 1. Check against trusted domains (fastest - always allow)
      if (this.trustedDomains!.has(domain)) {
        return { isTemp: false, confidence: 100 };
      }

      // 2. Check against known temp domains from database
      if (this.knownTempDomains!.has(domain)) {
        // Get additional info from database
        const domainInfo = await this.getBlockedDomainInfo(domain);
        return {
          isTemp: true,
          reason: domainInfo?.reason || 'Known temporary email service',
          confidence: domainInfo?.confidence || 100
        };
      }

      // 3. Pattern matching for suspicious domains
      const patternMatch = this.checkPatterns(domain);
      if (patternMatch.isTemp) {
        return patternMatch;
      }

      // 4. Check for subdomains of known temp services
      const subdomainCheck = this.checkSubdomains(domain);
      if (subdomainCheck.isTemp) {
        return subdomainCheck;
      }

      // 5. ML-based detection
      const mlCheck = this.mlHeuristicCheck(domain);
      if (mlCheck.isTemp && mlCheck.confidence > 70) {
        // Auto-add high confidence domains to database
        if (mlCheck.confidence > 85) {
          await this.autoAddBlockedDomain(domain, mlCheck.reason || 'Auto-detected pattern', mlCheck.confidence);
        }
        return mlCheck;
      }

      return { isTemp: false, confidence: 60 };

    } catch (error) {
      console.error('Temp email detection error:', error);
      return { isTemp: false, confidence: 50 };
    }
  }

  /**
   * Get detailed info about a blocked domain
   */
  private static async getBlockedDomainInfo(domain: string) {
    try {
      const result = await db
        .select({
          reason: blockedEmailDomains.reason,
          confidence: blockedEmailDomains.confidence,
          category: blockedEmailDomains.category,
        })
        .from(blockedEmailDomains)
        .where(eq(blockedEmailDomains.domain, domain))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Auto-add detected temp domains to database
   */
  private static async autoAddBlockedDomain(domain: string, reason: string, confidence: number) {
    try {
      await db.insert(blockedEmailDomains).values({
        domain,
        reason,
        confidence,
        category: 'temporary',
        source: 'automated',
        isActive: true,
      }).onConflictDoUpdate({
        target: blockedEmailDomains.domain,
        set: {
          hitCount: sql`${blockedEmailDomains.hitCount} + 1`,
          updatedAt: new Date(),
        }
      });

      // Update in-memory cache
      this.knownTempDomains?.add(domain);
    } catch (error) {
      console.error('Failed to auto-add blocked domain:', error);
    }
  }

  /**
   * Manually add a domain to blocklist
   */
  static async addBlockedDomain(domain: string, reason?: string, confidence: number = 100, userId?: string) {
    try {
      await db.insert(blockedEmailDomains).values({
        domain: domain.toLowerCase(),
        reason,
        confidence,
        category: 'temporary',
        source: 'manual',
        isActive: true,
        createdBy: userId,
      }).onConflictDoNothing();

      // Update in-memory cache
      this.knownTempDomains?.add(domain.toLowerCase());
      return true;
    } catch (error) {
      console.error('Failed to add blocked domain:', error);
      return false;
    }
  }

  /**
   * Add a domain to trusted list
   */
  static async addTrustedDomain(domain: string, providerName?: string, userId?: string) {
    try {
      await db.insert(trustedEmailDomains).values({
        domain: domain.toLowerCase(),
        providerName,
        isActive: true,
      }).onConflictDoNothing();

      // Update in-memory cache
      this.trustedDomains?.add(domain.toLowerCase());
      return true;
    } catch (error) {
      console.error('Failed to add trusted domain:', error);
      return false;
    }
  }

  /**
   * Refresh cache from database
   */
  static async refreshCache() {
    this.knownTempDomains = null;
    this.trustedDomains = null;
    await this.initialize();
  }

  /**
   * Get statistics
   */
  static async getStats() {
    if (!this.knownTempDomains || !this.trustedDomains) {
      await this.initialize();
    }

    const [blockedCount, trustedCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(blockedEmailDomains)
        .where(eq(blockedEmailDomains.isActive, true)),

      db.select({ count: sql<number>`count(*)` })
        .from(trustedEmailDomains)
        .where(eq(trustedEmailDomains.isActive, true)),
    ]);

    return {
      blockedDomainsInCache: this.knownTempDomains?.size || 0,
      trustedDomainsInCache: this.trustedDomains?.size || 0,
      blockedDomainsInDB: blockedCount[0]?.count || 0,
      trustedDomainsInDB: trustedCount[0]?.count || 0,
    };
  }

  // Keep the existing helper methods (extractDomain, checkPatterns, etc.)
  private static extractDomain(email: string): string | null {
    const parts = email.split('@');
    if (parts.length !== 2) return null;
    return parts[1].toLowerCase().trim().replace(/^www\./, '');
  }

  private static checkPatterns(domain: string) {
    // ... (same as before)
    return { isTemp: false, confidence: 50 };
  }

  private static checkSubdomains(domain: string) {
    // ... (same as before)
    return { isTemp: false, confidence: 50 };
  }

  private static mlHeuristicCheck(domain: string) {
    // ... (same as before)
    return { isTemp: false, confidence: 50, reason: '' };
  }
}
