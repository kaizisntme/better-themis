#include <bits/stdc++.h>
#define int long long

using namespace std;
const int N = 1e5 + 7;
int n, k;
int a[N], v[N];
void update()
{
    for (int i = 1; i <= k; i++)
    {
        cout << v[i] << ' ';
    }
    cout << '\n';
}
void bt(int i, int j)
{
    for (; j <= n; j++)
    {
        v[i] = a[j];
        if (i == k)
        {
            update();
        }
        else
            bt(i + 1, j + 1);
    }
}
signed main()
{
    ios_base::sync_with_stdio(0);
    cin.tie(0);
    cout.tie(0);

    freopen("TCK.inp", "r", stdin);
    freopen("TCK.out", "w", stdout);

    cin >> n >> k;
    for (int i = 1; i <= n; i++)
        cin >> a[i];
    // sort(a + 1, a + n + 1);
    if (n == k)
        for (int i = 1; i <= n; i++)
            cout << a[i] << ' ';
    else
        bt(1, 1);
    return 0;
}
