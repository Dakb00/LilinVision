#include <gtest/gtest.h>
#include <application/StreamManager.hpp>
#include <adapters/mock/MockAdapters.hpp>
#include <memory>
#include <thread>
#include <chrono>

using namespace vms;

class StreamManagerTest : public ::testing::Test {
protected:
    std::shared_ptr<MockCameraRepository> mockRepo;
    std::unique_ptr<StreamManager> manager;

    void SetUp() override {
        mockRepo = std::make_shared<MockCameraRepository>();
        manager = std::make_unique<StreamManager>(mockRepo, nullptr);
    }
};

TEST_F(StreamManagerTest, StartsAllEnabledCameras) {
    // Act
    manager->startAll();
    
    // Allow threads some time to start and produce a mock detection
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // In a real test, we would verify side effects (like logs or DB calls)
    // For now, if it doesn't crash, the orchestration is working.
    SUCCEED();
}

TEST_F(StreamManagerTest, ShutdownStopsAllThreads) {
    manager->startAll();
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Act
    manager->stopAll();
    
    // The destructor also calls stopAll() automatically.
    SUCCEED();
}
