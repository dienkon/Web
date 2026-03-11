#include <bits/stdc++.h>

using namespace std;

struct Node
{
    int x, y, res;
};

int BFS(int start_x, int start_y, int r, int c, vector<string> &arr)
{
    queue<Node> q;
    vector<vector<bool>> visited(r, vector<bool>(c, false));

    int dx[] = {-1, 1, 0, 0};
    int dy[] = {0, 0, 1, -1};

    q.push({start_x, start_y, 0});
    visited[start_x][start_y] = true;

    while (!q.empty())
    {
        Node f = q.front();
        q.pop();

        if (arr[f.x][f.y] == 'B')
            return f.res - 1;

        for (int i = 0; i < 4; i++)
        {
            int nx = f.x + dx[i];
            int ny = f.y + dy[i];

            if (nx >= 0 && nx < r && ny >= 0 && ny < c && arr[nx][ny] != '*' && !visited[nx][ny])
            {
                visited[nx][ny] = true;
                q.push({nx, ny, f.res + 1});
            }
        }
    }

    return -1;
}

int main()
{
    freopen("input.txt", "r", stdin);
    freopen("output.txt", "w", stdout);

    int r, c;
    cin >> r >> c;

    vector<string> arr(r);

    int x, y;

    for (int i = 0; i < r; i++)
    {
        cin >> arr[i];
        for (int j = 0; j < c; j++)
        {
            if (arr[i][j])
            {
                x = i;
                y = j;
            }
        }
    }

    cout << BFS(x, y, r, c, arr) << endl;

    return -1;
}
