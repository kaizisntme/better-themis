#include<bits/stdc++.h>
using namespace std;
int n,x,a[100003];
long long kq=0;
unordered_map<int,int> d;
int main(){
    ios_base::sync_with_stdio(0); cin.tie(0);cout.tie(0);
    freopen("sumx.inp","r",stdin);
    freopen("sumx.out","w",stdout);
    cin>>n>>x;
    for(int i=1;i<=n;i++) cin>>a[i];
    for(int i=1;i<=n;i++){
        for(int j=i+1;j<=n;j++)
            kq+=d[x-2*a[i]-3*a[j]];
        d[a[i]]++;
    }
    cout<<kq;
}
