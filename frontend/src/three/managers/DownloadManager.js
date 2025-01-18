class DownloadManager {
  constructor() {
    if (DownloadManager.instance) {
      return DownloadManager.instance;
    }
    this.queue = [];
    this.activeDownloads = 0;
    this.maxConcurrentDownloads = 3; // Adjust as needed
    DownloadManager.instance = this;
  }

  addToQueue(imageInstance) {
    //   logger.log(imageInstance, "added to queue");
    this.queue.push(imageInstance);
    this.processQueue();
  }

  prioritizeDownload(imageInstance) {
    // Move the prioritized image to the front of the queue
    this.queue = this.queue.filter((item) => item !== imageInstance);
    this.queue.unshift(imageInstance);
    this.processQueue();
  }

  processQueue() {
    while (
      this.activeDownloads < this.maxConcurrentDownloads &&
      this.queue.length > 0
    ) {
    //   logger.log("processing next item in queue");
      const imageInstance = this.queue.shift();
      this.activeDownloads++;
      imageInstance
        .loadAllImages()
        .then(() => {
          this.activeDownloads--;
          this.processQueue();
        })
        .catch(() => {
          this.activeDownloads--;
          this.processQueue();
        });
    }
  }
}


const downloadManager = new DownloadManager();
export default downloadManager;
