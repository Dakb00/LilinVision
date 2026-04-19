#pragma once

#include <map>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>

#include <domain/Entities.hpp>
#include <ports/IStreamSource.hpp>
#include <ports/IInferenceService.hpp>
#include <ports/ICameraRepository.hpp>

namespace vms {

/**
 * @brief Manages the lifecycle of camera worker threads.
 */
class StreamManager {
public:
    StreamManager(
        std::shared_ptr<ICameraRepository> repository,
        std::shared_ptr<IInferenceService> globalInference // May be null if using per-camera models
    );
    ~StreamManager();

    /**
     * @brief Start streaming and processing for all enabled cameras in the DB.
     */
    void startAll();

    /**
     * @brief Stop all camera threads.
     */
    void stopAll();

    /**
     * @brief Get the latest frame for a specific camera.
     */
    std::shared_ptr<cv::Mat> getLatestFrame(int camera_id);

private:
    /**
     * @brief The core loop for a single camera.
     */
    void cameraWorkerLoop(int camera_id, std::stop_token stop_token);

    std::shared_ptr<ICameraRepository> m_repository;
    std::shared_ptr<IInferenceService> m_globalInference;

    // Map of CameraID -> Thread
    std::map<int, std::jthread> m_workers;
    
    // Map of CameraID -> Latest Frame (for MJPEG)
    std::map<int, std::shared_ptr<cv::Mat>> m_latestFrames;
    std::mutex m_frameMutex;
    
    std::mutex m_workersMutex;
};

} // namespace vms
