#pragma once

#include <memory>
#include <string>
#include <ports/ICameraRepository.hpp>
#include <application/StreamManager.hpp>

namespace vms {

/**
 * @brief Adapter for the Crow Web Framework.
 */
class CrowRestServer {
public:
    CrowRestServer(
        std::shared_ptr<ICameraRepository> repository,
        std::shared_ptr<StreamManager> stream_manager
    );
    ~CrowRestServer();

    /**
     * @brief Start the web server on the given port.
     */
    void run(int port = 5000);

private:
    std::shared_ptr<ICameraRepository> m_repository;
    std::shared_ptr<StreamManager> m_streamManager;
};

} // namespace vms
