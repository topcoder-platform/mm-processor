/*
 * Copyright (C) 2018 TopCoder Inc., All Rights Reserved.
 */
#include <string>
#include <vector>
using namespace std;

class InvalidClass {
public:
    InvalidClass() = default;

    int method(int a) {
        // The line below cause compilation error. I know.
        THIS_IS_AN_INVALID_LINE_THAT_WOULD_CAUSE_COMPILATION_ERROR;
        return 1;
    }
};