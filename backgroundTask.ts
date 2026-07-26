// backgroundTask.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { geoClient } from './GeoJsonClient';

export const BACKGROUND_GEOJSON_TASK = 'BACKGROUND_GEOJSON_FETCH';

// Define the background task
TaskManager.defineTask(BACKGROUND_GEOJSON_TASK, async () => {
  try {
    // Check for updates to your target tile/geojson file
    await geoClient.checkForUpdates('data/locations.geojson');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background update failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper function to register the task
export async function registerBackgroundFetch() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GEOJSON_TASK);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_GEOJSON_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed by OS)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}