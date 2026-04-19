#include "DarkHelpInferenceAdapter.hpp"
#include <iostream>

namespace vms {

DarkHelpInferenceAdapter::DarkHelpInferenceAdapter(float confidence_threshold) 
    : m_threshold(confidence_threshold) {
    // Note: Future refactoring could move this threshold to a per-camera config
}

bool DarkHelpInferenceAdapter::loadModel(const std::string& configPath, 
                                        const std::string& weightsPath,
                                        const std::string& namesPath) {
    std::lock_guard<std::mutex> lock(m_nnMutex);
    try {
        m_nn.init(configPath, weightsPath, namesPath);
        m_nn.threshold = m_threshold;
        m_isReady = true;
        std::cout << "[AI] Model loaded successfully: " << weightsPath << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "[AI] Error loading model: " << e.what() << std::endl;
        return false;
    }
}

std::vector<Detection> DarkHelpInferenceAdapter::infer(const cv::Mat& frame) {
    if (!m_isReady || frame.empty()) return {};

    std::lock_guard<std::mutex> lock(m_nnMutex);
    
    // DECISION: Downscale to 416x416 as requested for performance
    cv::Mat resizedFrame;
    cv::resize(frame, resizedFrame, cv::Size(416, 416));

    // DarkHelp performs the detection
    auto results = m_nn.predict(resizedFrame);

    std::vector<Detection> detections;
    for (const auto& res : results) {
        // We only care about detections above our global 0.7 threshold
        // (DarkHelp's prediction already filters by m_nn.threshold)
        
        Detection det;
        det.class_id = res.best_class;
        det.label = res.name;
        det.confidence = res.best_probability;
        
        // Note: The bounding box is relative to the 416x416 image.
        // In the future, we might want to scale it back to the original frame size.
        det.bounding_box = res.rect; 
        
        detections.push_back(det);
    }

    return detections;
}

std::vector<std::string> DarkHelpInferenceAdapter::getLabels() const {
    std::lock_guard<std::mutex> lock(m_nnMutex);
    return m_nn.names;
}

void DarkHelpInferenceAdapter::warmup() {
    if (!m_isReady) return;
    // Run a dummy frame to initialize buffers
    cv::Mat dummy = cv::Mat::zeros(416, 416, CV_8UC3);
    infer(dummy);
}

bool DarkHelpInferenceAdapter::isReady() const {
    return m_isReady;
}

} // namespace vms
