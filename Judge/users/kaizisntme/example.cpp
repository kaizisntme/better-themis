#include <ios>
#include <iostream>

int main()
{
	freopen("example.inp", "r", stdin);
	freopen("example.out", "w", stdout);
	std::ios_base::sync_with_stdio(false);
	std::cin.tie(nullptr), std::cout.tie(nullptr);
	long long n;
	std::cin >> n;
	// int a[-10];
	std::cout << n;
	return 0;
}
