#include "testlib.h"
#include <string>
#include <vector>
#include <sstream>

using namespace std;

bool compareWords(const string &a, const string &b)
{
    vector<string> va, vb;
    stringstream sa;

    sa << a;
    string cur;
    while (sa >> cur)
        va.push_back(cur);

    stringstream sb;
    sb << b;
    while (sb >> cur)
        vb.push_back(cur);

    return (va == vb);
}

int main(int argc, char *argv[])
{
    setName("compare files as sequence of tokens in lines");
    registerTestlibCmd(argc, argv);

    string strAnswer;

    int n = 0;
    while (!ans.eof())
    {
        std::string j = ans.readString();

        if (j.empty() && ans.eof())
            break;

        string p = ouf.readString();
        strAnswer = p;

        n++;

        if (!compareWords(j, p))
            quitf(_wa, "%d%s line differ - expected: '%s', found: '%s'", n, englishEnding(n).c_str(),
                  compress(j).c_str(), compress(p).c_str());
    }

    quitf(_ok, "%d line(s)", n);
}