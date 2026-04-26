#pragma once

#include <string>
#include <memory>
#include <ports/ICameraRepository.hpp>
#include <domain/Entities.hpp>

namespace vms {

/**
 * @brief Service to handle outbound HTTP notifications.
 */
class WebhookService {
public:
    WebhookService(std::shared_ptr<ICameraRepository> repository);
    
    /**
     * @brief Send a detection event to the configured remote URL.
     * @return The response from the remote server (as captured from stdout).
     */
    std::string sendDetection(const DetectionEvent& event);

private:
    std::shared_ptr<ICameraRepository> m_repository;
};

} // namespace vms
