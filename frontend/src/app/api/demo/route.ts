import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // In a real production environment, you would use a dedicated API gateway or internal network
    // For this prototype, we'll try to hit the backend directly if possible, or gracefully mock it.
    
    // Since we know the backend runs on port 4000 locally, and on Render in production:
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    console.log('Sending demo image to backend:', backendUrl);
    
    const backendResponse = await fetch(`${backendUrl}/demo/process-image`, {
      method: 'POST',
      body: formData,
    });
    
    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }
    
    const data = await backendResponse.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Demo proxy error:', error);
    // If backend is unreachable (e.g., Render spun down, or CORS blocked), we provide a fallback simulated response
    // so the demo never completely breaks for a potential customer.
    return NextResponse.json({ 
      error: 'Backend processing failed, showing fallback',
      fallback: true
    }, { status: 500 });
  }
}
