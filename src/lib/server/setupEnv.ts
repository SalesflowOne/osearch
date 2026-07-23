export const AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

export const isVercelDeployment = () => process.env.VERCEL === '1';

export const isAiGatewayEnabled = () =>
  process.env.VERCEL_AI_GATEWAY_ENABLED === 'true' ||
  Boolean(process.env.AI_GATEWAY_API_KEY);

export const getAiGatewayApiKey = () =>
  process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';

export const hasEnvConfiguredChatProviders = () =>
  Boolean(
    process.env.OPENAI_API_KEY ||
      getAiGatewayApiKey() ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.GEMINI_API_KEY,
  );

export const isSetupCompleteFromEnv = () => {
  if (process.env.SETUP_COMPLETE === 'true') {
    return true;
  }

  if (
    isVercelDeployment() &&
    process.env.VERCEL_AI_GATEWAY_ENABLED === 'true'
  ) {
    return true;
  }

  return isVercelDeployment() && hasEnvConfiguredChatProviders();
};
