import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setContainerSource } from './containerTransform';
import { useLayout } from './layout';

/**
 * Opening a job card, vehicle, part or the intake. [el] is the card or FAB tapped. On phones the
 * detail grows out of it (container transform); on rail layouts details open in the side sheet, and
 * only the intake FAB is a [hero] container transform.
 */
export function useOpeners() {
  const navigate = useNavigate();
  const { isCompact } = useLayout();
  const source = useCallback(
    (key: string, el: HTMLElement | null | undefined, hero: boolean) => {
      if (el && (isCompact || hero)) setContainerSource(key, el);
    },
    [isCompact]
  );
  return {
    openJob: useCallback(
      (id: string, el?: HTMLElement | null) => {
        source(`job:${id}`, el, false);
        navigate(`/jobs/${id}`);
      },
      [navigate, source]
    ),
    editJob: useCallback((id: string) => navigate(`/jobs/${id}/edit`), [navigate]),
    openVehicle: useCallback(
      (id: string, el?: HTMLElement | null) => {
        source(`vehicle:${id}`, el, false);
        navigate(`/vehicles/${id}`);
      },
      [navigate, source]
    ),
    openPart: useCallback(
      (id: string, el?: HTMLElement | null) => {
        source(`part:${id}`, el, false);
        navigate(`/inventory/${id}`);
      },
      [navigate, source]
    ),
    openIntake: useCallback(
      (el?: HTMLElement | null) => {
        source('intake', el, true);
        navigate('/intake');
      },
      [navigate, source]
    ),
  };
}
