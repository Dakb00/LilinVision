#pragma once

#include <opencv2/opencv.hpp>
#include <memory>
#include <string>

namespace vms {

/**
 * @brief Interface for video capture (RTSP/Webcam/File).
 */
class IStreamSource {
public:
    virtual ~IStreamSource() = default;

    /**
     * @brief Open the video source at the given URL.
     * @return true if successful, false otherwise.
     */
    virtual bool open(const std::string& url) = 0;

    /**
     * @brief Capture the next frame from the stream.
     * @return A shared pointer to the captured frame, or nullptr if capture fails.
     */
    virtual std::shared_ptr<cv::Mat> grabNextFrame() = 0;

    /**
     * @brief Close the video source and release resources.
     */
    virtual void close() = 0;

    /**
     * @brief Check if the video source is currently open and producing frames.
     */
    virtual bool isOpened() const = 0;
};

} // namespace vms
