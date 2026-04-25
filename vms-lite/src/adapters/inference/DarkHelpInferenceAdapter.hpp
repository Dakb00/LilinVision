#pragma once

#include <DarkHelp.hpp>
#include <ports/IInferenceService.hpp>
#include <mutex>

namespace vms {

/**
 * @brief Concrete implementation of IInferenceService using DarkHelp (Darknet).
 */
class DarkHelpInferenceAdapter : public IInferenceService {
public:
    DarkHelpInferenceAdapter(float confidence_threshold = 0.7f);
    ~DarkHelpInferenceAdapter() = default;

    bool loadModel(const std::string& configPath, 
                  const std::string& weightsPath,
                  const std::string& namesPath) override;

    std::vector<Detection> infer(std::shared_ptr<cv::Mat> frame) override;
    std::vector<std::string> getLabels() const override;
    void warmup() override;
    bool isReady() const override;

private:
    DarkHelp::NN m_nn;
    float m_threshold;
    bool m_isReady = false;
    mutable std::mutex m_nnMutex; // Darknet is generally not thread-safe for a single instance
};

} // namespace vms
