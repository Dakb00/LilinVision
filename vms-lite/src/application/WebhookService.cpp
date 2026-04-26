#include "WebhookService.hpp"
#include <iostream>
#include <cstdio>
#include <array>
#include <sstream>

namespace vms {

WebhookService::WebhookService(std::shared_ptr<ICameraRepository> repository) 
    : m_repository(repository) {}

std::string WebhookService::sendDetection(const DetectionEvent& event) {
    std::string url = m_repository->getSetting("webhook_url", "");
    if (url.empty()) {
        return "No webhook URL configured.";
    }

    // Construct JSON payload manually (to avoid adding more dependencies)
    std::stringstream json;
    json << "{"
         << "\"camera_id\":" << event.camera_id << ","
         << "\"label\":\"" << event.label << "\","
         << "\"confidence\":" << event.confidence << ","
         << "\"timestamp\":" << event.timestamp
         << "}";

    std::string payload = json.str();
    
    // Use curl via popen to capture the response
    std::string command = "curl -s -X POST -H \"Content-Type: application/json\" -d '" + payload + "' " + url;
    
    std::string response;
    std::array<char, 128> buffer;
    std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(command.c_str(), "r"), pclose);
    
    if (!pipe) {
        return "Error: Failed to run curl command.";
    }
    
    while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
        response += buffer.data();
    }

    if (response.empty()) {
        return "Success (empty response)";
    }

    return response;
}

} // namespace vms
