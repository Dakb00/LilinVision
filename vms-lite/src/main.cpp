#include <iostream>
#include <memory>
#include <thread>
#include <chrono>
#include <string>

#include <application/StreamManager.hpp>
#include <adapters/mock/MockAdapters.hpp>
#include <adapters/storage/SQLiteCameraRepository.hpp>
#include <adapters/network/CrowRestServer.hpp>

int main(int argc, char** argv) {
    bool use_mocks = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string(argv[i]) == "--mock") {
            use_mocks = true;
        }
    }

    std::cout << "--- VMS Lite ---" << std::endl;
    if (use_mocks) std::cout << "[Mode] Running with MOCK adapters." << std::endl;
    else std::cout << "[Mode] Running with REAL adapters." << std::endl;

    // 1. Setup Infrastructure
    std::shared_ptr<vms::ICameraRepository> repository;
    if (use_mocks) {
        repository = std::make_shared<vms::MockCameraRepository>();
    } else {
        repository = std::make_shared<vms::SQLiteCameraRepository>("history.db");
        
        // Seed some real test cameras if DB is empty
        if (repository->getAllCameras().empty()) {
            vms::Camera c1;
            c1.name = "Test Camera";
            c1.rtsp_url = "rtsp://admin:password@192.168.1.10/stream1"; // Change to a real one for testing
            c1.is_enabled = true;
            repository->addCamera(c1);
        }
    }
    
    // 2. Initialize Stream Manager
    auto stream_manager = std::make_shared<vms::StreamManager>(repository, nullptr);

    // 3. Initialize Web Server
    vms::CrowRestServer web_server(repository, stream_manager);

    // 4. Start all cameras in background
    std::cout << "[Main] Starting camera streams..." << std::endl;
    stream_manager->startAll();

    // 5. Run Web Server (Blocking)
    web_server.run(5000);

    // 6. Shutdown
    std::cout << "[Main] Shutting down..." << std::endl;
    stream_manager->stopAll();

    std::cout << "--- Done ---" << std::endl;
    return 0;
}
