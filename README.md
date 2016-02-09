## REST API vs. WebSocket API
saikoh.tk は REST API と WebSocket API の両方で同等の機能を提供していますが, 好きな方を選んでください

## REST API
### GET `/buttons`

### POST `/buttons/:slug`
Clicks a button.

#### Parameters
None.

#### Example Request
POST
`http://api.saikoh.tk/buttons/saikoh`

#### Example Result
```
{
  "slug": "saikoh",
  "name": "最高",
  "count": 965357
}
```

## WebSocket API
