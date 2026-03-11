## Summary

Your Apify actor **yuurimikasa~my-actor** was created from a template but needs to be updated to accept the new input format.

### Files I've created for you in `/apify/`:

```
apify/
├── src/
│   ├── main.js              # Updated entry point (accepts targetUrl)
│   ├── routes.js            # Social media scraper routes
│   ├── input_schema.json    # Input configuration
│   ├── output_schema.json   # Output configuration
│   └── dataset_schema.json  # Dataset schema
├── .actor/
│   └── actor.json           # Actor configuration
├── Dockerfile               # Docker build file
├── README.md               # Full documentation
└── package.json            # Dependencies
```

### To Deploy and Test:

**Option 1: Upload via Apify Console**

1. Zip the entire `apify/` folder
2. Go to [Apify Console](https://console.apify.com/actors)
3. Open your actor `yuurimikasa~my-actor`
4. Click **Source** tab → **Upload .zip**
5. Upload the zip file
6. Click **Build** and wait for it to complete

**Option 2: GitHub Integration**

1. Push the `apify/` folder to a GitHub repository
2. In Apify Console → Your Actor → Source
3. Select **GitHub repository**
4. Connect your repo and select the `apify/` folder

### To Test After Deployment:

```bash
# Run synchronously (get results immediately)
curl -X POST "https://api.apify.com/v2/acts/yuurimikasa~my-actor/run-sync-get-dataset-items" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://github.com/octocat"}'
```

### Current Issue:

The actor failed because:
- Your current actor code expects `startUrls` array (from template)
- But the input schema requires `targetUrl` (from my schema)

**Fix:** You need to rebuild the actor with the updated code I created.
