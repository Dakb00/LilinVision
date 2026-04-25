#include "StreamManager.hpp"
#include <adapters/mock/MockAdapters.hpp>
#include <adapters/capture/OpenCVStreamAdapter.hpp>
#include <adapters/inference/DarkHelpInferenceAdapter.hpp>
#include <iostream>
#include <chrono>

namespace vms {

StreamManager::StreamManager(
    std::shared_ptr<ICameraRepository> repository,
    const ModelConfig& modelConfig
) : m_repository(repository), m_modelConfig(modelConfig) {}

StreamManager::~StreamManager() {
    stopAll();
}

void StreamManager::startAll() {
    auto cameras = m_repository->getAllCameras();
    for (const auto& cam : cameras) {
        if (cam.is_enabled) {
            startCamera(cam.id);
        }
    }
}

void StreamManager::stopAll() {
    std::lock_guard<std::mutex> lock(m_workersMutex);
    m_workers.clear(); // std::jthread will automatically request stop and join on destruction
}

void StreamManager::startCamera(int camera_id) {
    std::lock_guard<std::mutex> lock(m_workersMutex);
    if (m_workers.find(camera_id) != m_workers.end()) {
        return; // Already running
    }

    m_workers[camera_id] = std::jthread([this, camera_id](std::stop_token st) {
        this->cameraWorkerLoop(camera_id, st);
    });
}

void StreamManager::stopCamera(int camera_id) {
    std::lock_guard<std::mutex> lock(m_workersMutex);
    m_workers.erase(camera_id);
    
    std::lock_guard<std::mutex> flock(m_frameMutex);
    m_latestFrames.erase(camera_id);
}

std::shared_ptr<cv::Mat> StreamManager::getLatestFrame(int camera_id) {
    std::lock_guard<std::mutex> lock(m_frameMutex);
    if (m_latestFrames.find(camera_id) != m_latestFrames.end()) {
        return m_latestFrames[camera_id];
    }
    return nullptr;
}

void StreamManager::cameraWorkerLoop(int camera_id, std::stop_token stop_token) {
    auto camera_opt = m_repository->getCameraById(camera_id);
    if (!camera_opt) return;
    
    Camera camera = *camera_opt;
    std::cout << "[Camera " << camera_id << "] Thread started for " << camera.name << std::endl;

    std::unique_ptr<IStreamSource> source = std::make_unique<OpenCVStreamAdapter>();
    std::unique_ptr<IInferenceService> inference = std::make_unique<DarkHelpInferenceAdapter>(0.7f);

    inference->loadModel(m_modelConfig.configPath, 
                        m_modelConfig.weightsPath, 
                        m_modelConfig.namesPath);

    std::map<std::string, std::chrono::steady_clock::time_point> last_seen;
    const auto cooldown_period = std::chrono::seconds(10);
    const auto retry_delay = std::chrono::seconds(5);

    while (!stop_token.stop_requested()) {
        if (!source->isOpened()) {
            m_repository->updateCameraStatus(camera_id, "Disconnected");
            if (!source->open(camera.rtsp_url)) {
                std::this_thread::sleep_for(retry_delay);
                continue;
            }
            m_repository->updateCameraStatus(camera_id, "Connected");
        }

        std::shared_ptr<cv::Mat> frame = source->grabNextFrame();
        if (!frame) {
            source->close();
            continue;
        }

        // B. Run Inference
        std::vector<Detection> detections = inference->infer(frame);

        // --- DRAW BOUNDING BOXES (Decision 2) ---
        for (const auto& det : detections) {
            cv::rectangle(*frame, det.bounding_box, cv::Scalar(0, 255, 0), 2);
            std::string label_text = det.label + " " + std::to_string((int)(det.confidence * 100)) + "%";
            cv::putText(*frame, label_text, cv::Point(det.bounding_box.x, det.bounding_box.y - 5), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.5, cv::Scalar(0, 255, 0), 1);
        }

        // --- Store latest frame for MJPEG sharing ---
        {
            std::lock_guard<std::mutex> lock(m_frameMutex);
            m_latestFrames[camera_id] = frame;
        }

        // C. Process Detections (Cooldown Logic)
        for (const auto& det : detections) {
            auto now = std::chrono::steady_clock::now();
            if (last_seen.find(det.label) == last_seen.end() || 
                (now - last_seen[det.label]) > cooldown_period) {
                
                DetectionEvent event;
                event.camera_id = camera_id;
                event.label = det.label;
                event.confidence = det.confidence;
                event.timestamp = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
                
                // Encode to JPEG for BLOB storage
                cv::imencode(".jpg", *frame, event.image_data);
                
                m_repository->saveDetection(event);
                last_seen[det.label] = now;
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    source->close();
    m_repository->updateCameraStatus(camera_id, "Idle");
    std::cout << "[Camera " << camera_id << "] Thread stopping." << std::endl;
}

} // namespace vms
