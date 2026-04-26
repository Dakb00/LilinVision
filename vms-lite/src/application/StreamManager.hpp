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
#include <application/WebhookService.hpp>
#include <functional>

namespace vms {

/**
 * @brief Paths to the YOLO model files.
 */
struct ModelConfig {
    std::string configPath;
    std::string weightsPath;
    std::string namesPath;
};

/**
 * @brief Manages the lifecycle of camera worker threads.
 */
class StreamManager {
public:
    StreamManager(
        std::shared_ptr<ICameraRepository> repository,
        const ModelConfig& modelConfig
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
     * @brief Start a specific camera thread.
     */
    void startCamera(int camera_id);

    /**
     * @brief Stop a specific camera thread.
     */
    void stopCamera(int camera_id);

    /**
     * @brief Get the latest frame for a specific camera.
     */
    std::shared_ptr<cv::Mat> getLatestFrame(int camera_id);

    /**
     * @brief Register a callback for when a detection occurs.
     */
    void setDetectionCallback(std::function<void(const DetectionEvent&, const std::string&)> cb);

private:
    /**
     * @brief The core loop for a single camera.
     */
    void cameraWorkerLoop(int camera_id, std::stop_token stop_token);

    std::shared_ptr<ICameraRepository> m_repository;
    ModelConfig m_modelConfig;
    std::unique_ptr<WebhookService> m_webhookService;
    std::function<void(const DetectionEvent&, const std::string&)> m_onDetection;

    // Map of CameraID -> Thread
    std::map<int, std::jthread> m_workers;
    
    // Map of CameraID -> Latest Frame (for MJPEG)
    std::map<int, std::shared_ptr<cv::Mat>> m_latestFrames;
    std::mutex m_frameMutex;
    
    std::mutex m_workersMutex;
};

} // namespace vms
