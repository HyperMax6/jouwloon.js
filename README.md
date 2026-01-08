# jouwloon.js

A small helper that logs into Jouwloon.nl and fetches your shifts.
> This library is completely unofficial. As such I do not take any responsibility upon it's usage.
## Example script
Here is a simple example script. Note that this library does not work if 2FA is turned on.
### Creating session
You can create a session with the `jouwloon.create(username, password)` function. This will return a jouwloon object, which is used for further requests.
```
import jouwloon from 'jouwloon';

const jl = await jouwloon.create('username', 'password');
```
### Fetching shifts
To fetch shifts, use the asynchronous function `getShifts(start, end)` on the jouwloon object.
```
const shifts = await jl.getShifts(new Date('2026-1-1'), new Date('2026-2-30'));
```
### Full Script
Returns all shifts in the coming 2 months.
```
import jouwloon from 'jouwloon';

const jl = await jouwloon.create('username', 'password');

const start = new Date();
const end = new Date();
end.setMonth(end.getMonth() + 2);

const shifts = await jl.getShifts(start, end);
console.log(shifts);
```
## Output
`getShifts()` returns an array of shifts in the format:
```
{
  id: '2026-01-25',
  start: 2026-01-25T16:00:00.000Z,
  end: 2026-01-25T21:00:00.000Z,
  afdeling: '3. MPS',
  vestiging: 100
}
```
