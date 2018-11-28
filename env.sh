#!/bin/bash
set -e

SAFE_PWD=$(echo "$PWD" | sed 's/ /\\ /g')

UNAME=`uname -s`
if [ x"$UNAME" = x"Darwin" ]; then
  export OS_VERSION=$(sw_vers|grep ProductVersion|awk -F" " '{print $2}')
  export DYLD_INSERT_LIBRARIES="$HOME/.cpp-mm-scoring/cling-0.5/lib/libcling.dylib"
  export PKG_CONFIG_PATH=/Library/Frameworks/Mono.framework/Versions/Current/lib/pkgconfig
else
  export LD_PRELOAD="/mm-processor/node_modules/cpp-mm-scoring/.sources/cling-0.5/lib/libcling.so"
fi
export CLING_DIR="/mm-processor/node_modules/cpp-mm-scoring/.sources/cling-0.5/lib/cmake/cling"
export LLVM_INSTALL_PREFIX="/mm-processor/node_modules/cpp-mm-scoring/.sources/cling-0.5"
export CLING_LIB_DIR="/mm-processor/node_modules/cpp-mm-scoring/.sources/cling-0.5/lib"
export NLOHMANN_JSON_INCLUDE_DIR="/mm-processor/node_modules/cpp-mm-scoring/.sources/include"
