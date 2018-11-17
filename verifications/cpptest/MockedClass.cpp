/*
 * Copyright (C) 2018 TopCoder Inc., All Rights Reserved.
 */
#include <string>
#include <vector>
#include <algorithm>
#include <stdexcept>
#include <unistd.h>
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

class MockedClass {
public:
    MockedClass() = default;

    // Test that all kinds of parameter types are supported.
    int testFullParameter(int a, double b, string c, vector<int> d,
                vector<double> e, vector<string> f) {
        if (d.empty()) {
            throw invalid_argument("vector<int> must not be empty");
        }
        if (e.empty()) {
            throw invalid_argument("vector<double> must not be empty");
        }
        if (c==string("INVALID")) {
            throw runtime_error("string parameter is invalid");
        }

        // Some very simple calculation inside.
        int ret = a + (int)b + c.size();
        for (auto x : d) {
            ret += x;
        }
        for (auto x : e) {
            ret += (int)x;
        }
        ret += f.size();

        return ret;
    }

    // Test vector<int> works well for both input and output.
    vector<int> testVectorIntInOutSort(vector<int> arr) {
        // Here auto keyword was used to ensure that c++11 is supported.
        auto ret = arr;
        std::sort(ret.begin(), ret.end());
        return ret;
    }

    // Test vector<double> works well for both input and output.
    vector<double> testVectorDoubleInOutX2(vector<double> arr) {
        vector<double> ret = arr;
        // Here lambda was used to ensure that c++11 is supported.
        std::transform(ret.begin(), ret.end(), ret.begin(), [](double x)->double {return x*2.0;});
        return ret;
    }

    // Test vector<string> works well for both input and output.
    vector<string> testVectorStrInOutReverse(vector<string> arr) {
        // Here auto keyword was used to ensure that c++11 is supported.
        auto ret = arr;
        std::reverse(ret.begin(), ret.end());
        return ret;
    }

    // Test all kinds of special strings. So that we may confirm that this
    // tool handles special characters correctly.
    string testReturnComplexStrAsItIs(string s) {
        return s;
    }

    // Test that the memory usage is properly estimated.
    int testMemoryUsage(int numMB) {
        if (numMB <= 0) {
            throw runtime_error("memory size must be positive");
        }
        std::chrono::milliseconds duration(200);
        int arraySize = numMB<<20;
        char* p = new char[arraySize];
        int ret = 0;
        p[0] = 1;
        // Tricky.
        // We must read/write on the allocated memory. Otherwise, cling may optimize
        // the code such that no memory being really allocated at all.
        for (int i=0; i<arraySize-1; ++i) {
            p[i+1] = p[i] + p[i];
        }
        std::this_thread::sleep_for(duration);
        ret = (int)p[arraySize-1];
        delete[] p;
        std::this_thread::sleep_for(duration);
        return ret;
    }

    // Test that the time elapsed is correctly estimated.
    int testTimeUsage(int ms) {
        if (ms <= 0) {
            throw runtime_error("sleep time must be positive");
        }
        std::chrono::milliseconds duration(ms);
        std::this_thread::sleep_for(duration);
        return ms;
    }
};

