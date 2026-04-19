#pragma once

#include <opencv2/opencv.hpp>
#include <ports/IStreamSource.hpp>
#include <string>
#include <memory>

namespace vms {

/**
 * @brief Concrete implementation of IStreamSource using OpenCV.
 */
class OpenCVStreamAdapter : public IStreamSource {
public:
    OpenCVStreamAdapter();
    ~OpenCVStreamAdapter();

    /**
     * @brief Opens the RTSP stream. Forces TCP for stability.
     */
    bool open(const std::string& url) override;

    /**
     * @brief Grabs the latest frame from the buffer.
     */
    std::shared_ptr<cv::Mat> grabNextFrame() override;

    void close() override;
    bool isOpened() const override;

private:
    cv::VideoCapture m_cap;
    std::string m_url;
};

} // namespace vms
