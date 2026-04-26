#pragma once

#include <memory>
#include <string>
#include <set>
#include <mutex>
#include <chrono>
#include <ports/ICameraRepository.hpp>
#include <application/StreamManager.hpp>
#include "crow_all.h"

namespace vms {

/**
 * @brief Adapter for the Crow Web Framework.
 */
class CrowRestServer {
public:
    CrowRestServer(
        std::shared_ptr<ICameraRepository> repository,
        std::shared_ptr<StreamManager> stream_manager,
        const std::string& static_path = "./gui"
    );
    ~CrowRestServer();

    /**
     * @brief Start the web server on the given port.
     */
    void run(int port = 5000);

private:
    std::shared_ptr<ICameraRepository> m_repository;
    std::shared_ptr<StreamManager> m_streamManager;
    std::string m_staticPath;

    std::set<crow::websocket::connection*> m_users;
    std::mutex m_usersMutex;
    std::chrono::steady_clock::time_point m_startTime;
};

} // namespace vms
