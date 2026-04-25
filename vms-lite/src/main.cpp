#include <iostream>
#include <memory>
#include <thread>
#include <chrono>
#include <string>
#include <filesystem>

#include <application/StreamManager.hpp>
#include <adapters/mock/MockAdapters.hpp>
#include <adapters/storage/SQLiteCameraRepository.hpp>
#include <adapters/network/CrowRestServer.hpp>

int main(int argc, char** argv) {
    bool use_mocks = false;
    std::string static_path = "";
    
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--mock") {
            use_mocks = true;
        } else if (arg == "--gui" && i + 1 < argc) {
            static_path = argv[++i];
        }
    }

    // Auto-detect static path if not provided
    if (static_path.empty()) {
        // 1. Try local development path
        if (std::filesystem::exists("./visionguard/client/dist/index.html")) {
            static_path = "./visionguard/client/dist";
        } 
        // 2. Try standard installation path (Per Master Architecture Guide)
        else if (std::filesystem::exists("/usr/share/vms-lite/www/index.html")) {
            static_path = "/usr/share/vms-lite/www";
        }
        // 3. Last resort fallback
        else {
            static_path = "./www";
        }
    }

    // Auto-detect Database path (Per Master Architecture Guide)
    std::string db_path = "history.db"; // Default for local dev
    if (!use_mocks) {
        if (std::filesystem::exists("/var/lib/vms-lite/")) {
            db_path = "/var/lib/vms-lite/history.db";
        }
    }

    // Auto-detect Model paths
    vms::ModelConfig model_config;
    if (std::filesystem::exists("./yoloweights/peoplerpeople/people.cfg")) {
        model_config.configPath = "./yoloweights/peoplerpeople/people.cfg";
        model_config.weightsPath = "./yoloweights/peoplerpeople/people.weights";
        model_config.namesPath = "./yoloweights/peoplerpeople/people.names";
    } else if (std::filesystem::exists("/usr/share/vms-lite/models/people.cfg")) {
        model_config.configPath = "/usr/share/vms-lite/models/people.cfg";
        model_config.weightsPath = "/usr/share/vms-lite/models/people.weights";
        model_config.namesPath = "/usr/share/vms-lite/models/people.names";
    } else {
        // Fallback for safety (though it might fail if files are missing)
        model_config.configPath = "people.cfg";
        model_config.weightsPath = "people.weights";
        model_config.namesPath = "people.names";
    }

    std::cout << "--- VMS Lite ---" << std::endl;
    std::cout << "[Config] Static assets: " << static_path << std::endl;
    if (!use_mocks) {
        std::cout << "[Config] Database:      " << db_path << std::endl;
        std::cout << "[Config] Model Config:  " << model_config.configPath << std::endl;
    }
    
    if (use_mocks) std::cout << "[Mode] Running with MOCK adapters." << std::endl;
    else std::cout << "[Mode] Running with REAL adapters." << std::endl;

    // 1. Setup Infrastructure
    std::shared_ptr<vms::ICameraRepository> repository;
    if (use_mocks) {
        repository = std::make_shared<vms::MockCameraRepository>();
    } else {
        repository = std::make_shared<vms::SQLiteCameraRepository>(db_path);
        
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
    auto stream_manager = std::make_shared<vms::StreamManager>(repository, model_config);

    // 3. Initialize Web Server
    vms::CrowRestServer web_server(repository, stream_manager, static_path);

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
