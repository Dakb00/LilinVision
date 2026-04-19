#pragma once

#include <iostream>
#include <thread>
#include <chrono>
#include <ports/ICameraRepository.hpp>
#include <ports/IInferenceService.hpp>
#include <ports/IStreamSource.hpp>

namespace vms {

/**
 * @brief Mock Repository that returns fixed cameras.
 */
class MockCameraRepository : public ICameraRepository {
public:
    std::vector<Camera> getAllCameras() override {
        return {
            {1, "Front Door", "rtsp://mock/1", true, "Idle"},
            {2, "Backyard", "rtsp://mock/2", true, "Idle"}
        };
    }

    std::optional<Camera> getCameraById(int id) override {
        if (id == 1) return Camera{1, "Front Door", "rtsp://mock/1", true, "Idle"};
        if (id == 2) return Camera{2, "Backyard", "rtsp://mock/2", true, "Idle"};
        return std::nullopt;
    }

    bool addCamera(const Camera&) override { return true; }
    bool removeCamera(int) override { return true; }
    bool updateCameraStatus(int id, const std::string& status) override {
        std::cout << "[MockDB] Camera " << id << " status updated to: " << status << std::endl;
        return true;
    }

    bool saveDetection(const DetectionEvent& event) override {
        std::cout << "[MockDB] SAVED DETECTION: " << event.label 
                  << " (Conf: " << event.confidence << ") for Camera " << event.camera_id << std::endl;
        return true;
    }

    std::vector<DetectionEvent> getRecentDetections(int) override { return {}; }
    std::vector<DetectionEvent> getDetectionsByCamera(int, int) override { return {}; }
};

/**
 * @brief Mock Stream Source that generates empty frames.
 */
class MockStreamSource : public IStreamSource {
public:
    bool open(const std::string& url) override {
        std::cout << "[MockStream] Opening URL: " << url << std::endl;
        m_opened = true;
        return true;
    }

    std::shared_ptr<cv::Mat> grabNextFrame() override {
        if (!m_opened) return nullptr;
        std::this_thread::sleep_for(std::chrono::milliseconds(100)); // Simulate 10fps
        return std::make_shared<cv::Mat>(480, 640, CV_8UC3, cv::Scalar(0, 255, 0));
    }

    void close() override { m_opened = false; }
    bool isOpened() const override { return m_opened; }

private:
    bool m_opened = false;
};

/**
 * @brief Mock Inference Service that detects a "Person" every few seconds.
 */
class MockInferenceService : public IInferenceService {
public:
    bool loadModel(const std::string&, const std::string&, const std::string&) override {
        m_ready = true;
        return true;
    }

    std::vector<Detection> infer(const cv::Mat&) override {
        static int counter = 0;
        if (++counter % 20 == 0) { // Simulate a detection every ~2 seconds
            return {{1, "person", 0.95f, cv::Rect(10, 10, 100, 200)}};
        }
        return {};
    }

    std::vector<std::string> getLabels() const override { return {"person", "car", "dog"}; }
    void warmup() override {}
    bool isReady() const override { return m_ready; }

private:
    bool m_ready = false;
};

} // namespace vms
