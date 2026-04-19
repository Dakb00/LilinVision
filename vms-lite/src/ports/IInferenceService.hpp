#pragma once

#include <string>
#include <vector>
#include <opencv2/opencv.hpp>

/**
 * @brief Represents a single detection from the AI model.
 */
struct Detection {
    int class_id;
    std::string label;
    float confidence;
    cv::Rect bounding_box;
};

/**
 * @brief Interface for AI detection services.
 */
class IInferenceService {
public:
    virtual ~IInferenceService() = default;

    virtual bool loadModel(const std::string& configPath, 
                          const std::string& weightsPath,
                          const std::string& namesPath) = 0;

    virtual std::vector<Detection> infer(const cv::Mat& frame) = 0;
    virtual std::vector<std::string> getLabels() const = 0;
    virtual void warmup() = 0;
    virtual bool isReady() const = 0;
};
