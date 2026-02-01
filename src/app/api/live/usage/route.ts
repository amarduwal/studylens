import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recordLiveSessionUsage, getUsageStatus } from '@/lib/usage';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        live: { enabled: false, canStart: false },
      }, { status: 401 });
    }

    const usage = await getUsageStatus(session.user.id);

    return NextResponse.json({
      success: true,
      live: usage.live,
    });
  } catch (error) {
    console.error('Failed to get live usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get usage',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, durationMinutes } = body;

    if (action !== 'start' && action !== 'end') {
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
      }, { status: 400 });
    }

    // Check limits before starting
    if (action === 'start') {
      const usage = await getUsageStatus(session.user.id);
      if (!usage.live.canStart) {
        return NextResponse.json({
          success: false,
          error: 'Live session limit reached',
          live: usage.live,
        }, { status: 403 });
      }
    }

    await recordLiveSessionUsage(session.user.id, action, durationMinutes);

    // Return updated usage
    const updatedUsage = await getUsageStatus(session.user.id);

    return NextResponse.json({
      success: true,
      live: updatedUsage.live,
    });
  } catch (error) {
    console.error('Failed to update live usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update usage',
    }, { status: 500 });
  }
}
