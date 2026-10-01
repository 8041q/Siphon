export const AUTO_CHECK_UPDATES_KEY = 'siphon:settings:autoCheckUpdates';

type PreferenceStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export type AppUpdatePreferences = {
  autoCheckEnabled: boolean;
  autoCheckLoaded: boolean;
  autoCheckSaving: boolean;
};

export function createAppUpdatePreferences(
  store: PreferenceStore,
  onChange: (state: AppUpdatePreferences) => void,
) {
  let state: AppUpdatePreferences = {
    autoCheckEnabled: true,
    autoCheckLoaded: false,
    autoCheckSaving: false,
  };
  let loadPromise: Promise<void> | null = null;
  let saveQueue = Promise.resolve();
  let pendingSaves = 0;
  let startupHandled = false;

  function publish(next: Partial<AppUpdatePreferences>) {
    state = { ...state, ...next };
    onChange(state);
  }

  function load(): Promise<void> {
    if (!loadPromise) {
      loadPromise = (async () => {
        // Skip automatic requests if storage cannot confirm the preference.
        const value = await store.getItem(AUTO_CHECK_UPDATES_KEY).catch(() => 'false');
        publish({ autoCheckEnabled: value !== 'false', autoCheckLoaded: true });
      })();
    }
    return loadPromise;
  }

  async function setEnabled(enabled: boolean): Promise<boolean> {
    pendingSaves += 1;
    publish({ autoCheckSaving: true });
    let saved = false;
    const operation = saveQueue.then(async () => {
      await load();
      try {
        await store.setItem(AUTO_CHECK_UPDATES_KEY, String(enabled));
        publish({ autoCheckEnabled: enabled });
        saved = true;
      } catch {
        // Retain the last saved value so the switch matches the next launch.
      } finally {
        pendingSaves -= 1;
        publish({ autoCheckSaving: pendingSaves > 0 });
      }
    });
    saveQueue = operation;
    await operation;
    return saved;
  }

  async function checkOnStartup(check: () => Promise<void>): Promise<void> {
    await load();
    if (startupHandled) return;
    startupHandled = true;
    if (state.autoCheckEnabled) await check();
  }

  return { load, setEnabled, checkOnStartup };
}
