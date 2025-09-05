function withValidProperties(
  properties: Record<string, undefined | string | string[]>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    })
  );
}

export async function GET(request: Request) {
  try {
    const URL = process.env.NEXT_PUBLIC_URL;

    // Validate required environment variables
    const requiredEnvVars = {
      FARCASTER_HEADER: process.env.FARCASTER_HEADER,
      FARCASTER_PAYLOAD: process.env.FARCASTER_PAYLOAD,
      FARCASTER_SIGNATURE: process.env.FARCASTER_SIGNATURE,
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return Response.json(
        { 
          error: 'Configuration error',
          message: `Missing required environment variables: ${missingVars.join(', ')}`
        },
        { status: 500 }
      );
    }

    const frameConfig = withValidProperties({
      version: '1',
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [],
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE_URL,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE_URL,
      castShareUrl: URL,
      screenshotUrl: process.env.NEXT_PUBLIC_APP_SCREENSHOT_URLS,
      buttonTitle: process.env.NEXT_PUBLIC_APP_BUTTON_TITLE,
      imageUrl: process.env.NEXT_PUBLIC_APP_IMAGE_URL,
      castshareUrl: URL, // Note: you have both castShareUrl and castshareUrl
      tags: ["finance", "crypto", "utilities"],
    });

    const response = {
      accountAssociation: {
        header: process.env.FARCASTER_HEADER,
        payload: process.env.FARCASTER_PAYLOAD,
        signature: process.env.FARCASTER_SIGNATURE,
      },
      frame: frameConfig,
      baseBuilder: {
        allowedAddresses: ["0x3467fb5aA0E65923Bc0a46317b4ECEDAfeE2305a"]
      }
    };

    return Response.json(response);

  } catch (error) {
    console.error('Error in GET handler:', error);
    return Response.json(
      { 
        error: 'Internal server error',
        message: 'Failed to generate frame configuration'
      },
      { status: 500 }
    );
  }
}