/**
 * Robust fetch helper to safely handle responses from the server.
 * Protects against non-JSON / HTML responses (such as nginx 502/504 Bad Gateway,
 * Vite HTML fallbacks, or Cloud Run gateway errors) and translates them into
 * human-readable, actionable error messages instead of raw JSON syntax errors.
 */

export interface ApiResponseError extends Error {
  status?: number;
  data?: any;
  isDailyQuota?: boolean;
  isQuotaExceeded?: boolean;
  retryAfterSeconds?: number | null;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  defaultErrorMessage = 'Erreur lors de la communication avec le serveur'
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkErr: any) {
    const err: ApiResponseError = new Error(
      'Impossible de contacter le serveur. Vérifiez votre connexion internet.'
    );
    err.status = 0;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';

  // Check for HTML or non-JSON responses from proxy/gateway
  if (!contentType.includes('application/json')) {
    const rawText = await response.text().catch(() => '');

    let friendlyMessage = defaultErrorMessage;
    if (response.status === 504 || response.status === 408) {
      friendlyMessage =
        'Le serveur a mis trop de temps à répondre (Délai d’attente dépassé / Timeout). Veuillez réessayer dans quelques instants.';
    } else if (response.status === 502 || response.status === 503) {
      friendlyMessage =
        'Le service audio est temporairement indisponible (502/503). Veuillez patienter quelques secondes avant de relancer.';
    } else if (response.status === 404) {
      friendlyMessage = 'Ressource ou point d’accès introuvable sur le serveur (404).';
    } else if (rawText.toLowerCase().includes('gateway') || rawText.toLowerCase().includes('timeout')) {
      friendlyMessage =
        'Délai d’attente dépassé au niveau de la passerelle. Veuillez relancer la génération.';
    } else if (!response.ok) {
      friendlyMessage = `Erreur de communication avec le serveur (${response.status} ${response.statusText || ''}).`;
    }

    const err: ApiResponseError = new Error(friendlyMessage);
    err.status = response.status;
    throw err;
  }

  // Parse JSON safely
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    const err: ApiResponseError = new Error(
      'Format de réponse inattendu du serveur. Veuillez réessayer.'
    );
    err.status = response.status;
    throw err;
  }

  if (!response.ok || data?.error) {
    const errMsg = data?.error || defaultErrorMessage;
    const err: ApiResponseError = new Error(errMsg);
    err.status = response.status;
    err.data = data;
    err.isDailyQuota = !!data?.isDailyQuota;
    err.isQuotaExceeded = !!data?.isQuotaExceeded;
    err.retryAfterSeconds = data?.retryAfterSeconds ?? null;
    throw err;
  }

  return data as T;
}
