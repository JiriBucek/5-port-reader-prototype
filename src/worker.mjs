import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwksByTeamDomain = new Map();

function getJwks(teamDomain) {
  if (!jwksByTeamDomain.has(teamDomain)) {
    jwksByTeamDomain.set(
      teamDomain,
      createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
    );
  }
  return jwksByTeamDomain.get(teamDomain);
}

function getAccessConfig(env) {
  const teamDomain = env.TEAM_DOMAIN;
  const policyAud = env.POLICY_AUD;

  if (!teamDomain || !policyAud) {
    return {
      ok: false,
      response: new Response('Missing Cloudflare Access configuration.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    };
  }

  return {
    ok: true,
    teamDomain,
    policyAud
  };
}

async function requireAccess(request, env) {
  const config = getAccessConfig(env);
  if (!config.ok) {
    return config.response;
  }

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) {
    return new Response('Authentication required.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  try {
    await jwtVerify(token, getJwks(config.teamDomain), {
      issuer: config.teamDomain,
      audience: config.policyAud
    });
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown token error';
    return new Response(`Invalid access token: ${message}`, {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

export default {
  async fetch(request, env) {
    const authResponse = await requireAccess(request, env);
    if (authResponse) {
      return authResponse;
    }

    return env.ASSETS.fetch(request);
  }
};
