import { syncMarketDataService } from "../modules/market/market.service";

let intervalId: NodeJS.Timeout | null = null;

export const startMarketSyncJob = (): void => {
  if (intervalId) {
    return;
  }

  const run = async () => {
    try {
      console.log("Running market sync job...");
      await syncMarketDataService();
      console.log("Market sync job completed");
    } catch (error) {
      console.error("Market sync job failed:", error);
    }
  };

  void run();

  intervalId = setInterval(() => {
    void run();
  }, 60 * 1000);
};

export const stopMarketSyncJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};