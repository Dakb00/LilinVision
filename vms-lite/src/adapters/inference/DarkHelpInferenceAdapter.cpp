#include "DarkHelpInferenceAdapter.hpp"
#include <iostream>

namespace vms {

DarkHelpInferenceAdapter::DarkHelpInferenceAdapter(float confidence_threshold) 
    : m_threshold(confidence_threshold) {
}

bool DarkHelpInferenceAdapter::loadModel(const std::string& configPath, 
                                        const std::string& weightsPath,
                                        const std::string& namesPath) {
    std::lock_guard<std::mutex> lock(m_nnMutex);
    try {
        // DECISION: Enable redirection to keep logs clean during startup
        m_nn.config.redirect_darknet_output = true;
        
        m_nn.init(configPath, weightsPath, namesPath);
        
        m_nn.config.threshold = m_threshold;
        m_nn.config.sort_predictions = DarkHelp::ESort::kDescending;
        
        m_isReady = true;
        std::cout << "[AI] Model loaded successfully: " << weightsPath << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "[AI] Error loading model: " << e.what() << std::endl;
        return false;
    }
}

std::vector<Detection> DarkHelpInferenceAdapter::infer(std::shared_ptr<cv::Mat> frame) {
    if (!m_isReady || !frame || frame->empty()) return {};

    std::lock_guard<std::mutex> lock(m_nnMutex);
    
    // DECISION: Remove manual resizing. DarkHelp handles this internally 
    // and more efficiently, maintaining aspect ratio or tiling if configured.
    // Coordinates returned by predict() are already scaled back to the 'frame' size.
    auto results = m_nn.predict(*frame);

    std::vector<Detection> detections;
    detections.reserve(results.size());

    for (const auto& res : results) {
        Detection det;
        det.class_id = res.best_class;
        det.label = res.name;
        det.confidence = res.best_probability;
        
        // No manual scaling needed anymore!
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
    // Run a dummy frame to initialize buffers (e.g. CUDA memory)
    auto dummy = std::make_shared<cv::Mat>(cv::Mat::zeros(416, 416, CV_8UC3));
    infer(dummy);
}

bool DarkHelpInferenceAdapter::isReady() const {
    return m_isReady;
}

} // namespace vms
