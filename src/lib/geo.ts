interface GeoData {
  country: string | null;
  city: string | null;
}

export async function getGeoFromIP(ip: string | null): Promise<GeoData> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { country: null, city: null };
  }

  try {
    // Using free ip-api.com (45 requests/minute limit)
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,city`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) return { country: null, city: null };

    const data = await res.json();

    return {
      country: data.countryCode || null,
      city: data.city || null,
    };
  } catch {
    return { country: null, city: null };
  }
}
