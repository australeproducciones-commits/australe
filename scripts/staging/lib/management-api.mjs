const API = "https://api.supabase.com/v1";

export async function managementFetch(token, path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

export async function listOrganizations(token) {
  const { response, body } = await managementFetch(token, "/organizations");
  if (!response.ok) {
    throw new Error(`organizations: HTTP ${response.status}`);
  }
  return body;
}

export async function listProjects(token) {
  const { response, body } = await managementFetch(token, "/projects");
  if (!response.ok) {
    throw new Error(`projects: HTTP ${response.status}`);
  }
  return body;
}

export async function getProjectHealth(token, ref) {
  const { response, body } = await managementFetch(token, `/projects/${ref}/health`);
  return { ok: response.ok, body };
}

export async function waitForHealthyProject(token, ref, { timeoutMs = 600_000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { ok, body } = await getProjectHealth(token, ref);
    if (ok && body?.status === "ACTIVE_HEALTHY") {
      return true;
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error(`Proyecto ${ref} no alcanzó ACTIVE_HEALTHY a tiempo`);
}

export async function createStagingProject(token, { orgSlug, name, dbPass }) {
  const { response, body } = await managementFetch(token, "/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_slug: orgSlug,
      name,
      db_pass: dbPass,
      region_selection: { type: "smartGroup", code: "americas" },
      desired_instance_size: "micro",
    }),
  });
  if (!response.ok) {
    throw new Error(`create project: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

export async function getProjectApiKeys(token, ref) {
  const { response, body } = await managementFetch(token, `/projects/${ref}/api-keys`);
  if (!response.ok) {
    throw new Error(`api-keys: HTTP ${response.status}`);
  }
  return body;
}
