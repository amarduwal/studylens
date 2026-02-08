import LiveClient from './live-client';

export default function LivePage() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
  return <LiveClient apiKey={apiKey} />;
}
