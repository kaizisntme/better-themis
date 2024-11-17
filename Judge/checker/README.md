# Checker Tutorial

In some situations, the compiled checker will not work properly. For example, the current checker is compiled on Ubuntu 22.04 LTS, so may be it will not work properly on Windows. In order to fix this, please follow the instructions.

1. Compile the `checker.cpp` file, output file should be `check` or `check.exe`.

```bash
# Compile the `checker.cpp` file with C++14 compiler
g++ checker.cpp -o check --std=c++14

# Or on Windows
g++ checker.cpp -o check.exe --std=c++14
```

2. Copy the output file `check` or `check.exe` to the root folder (which the current checker is located in).

That's all you need to do, run the judge again to see changes. If the issues are not resolved, please [report an issue](/)!
