import { useApiClient } from '~/composables/useApiClient';
import { createSpacesApi } from '~/utils/spacesApi';

export function useSpacesApi() {
  const { apiRequest } = useApiClient();
  return createSpacesApi(apiRequest);
}
