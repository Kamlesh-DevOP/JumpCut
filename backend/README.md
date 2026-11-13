# JumpCut Backend

## External Puzzle Cron

An external scheduler can request generation of the upcoming puzzle slot:

```sh
curl -X POST https://your-backend.example.com/api/v1/internal/puzzles/generate \
  -H "X-Cron-Secret: your-long-random-secret"
```

Schedule this request every 10 minutes with a timeout of at least 15 minutes.
The endpoint generates the next thirty-minute slot only when one or more of the
four language puzzles are absent. Repeated requests safely return
`already_generated`, and a simultaneous request returns `already_running`.

Required backend variables:

```sh
PUZZLE_CRON_SECRET=
PUZZLE_PYTHON_BIN=python3
PIPELINE_DIRECTORY=/absolute/path/to/jumpcut/pipeline
```

The host must also have Python 3.11+ and the packages in
`pipeline/requirements.txt` installed. The pipeline directory must be writable
so its `cache/` data can persist between runs.

The scheduler frequency controls how often availability is checked. The actual
puzzle cadence remains configured in the application at 30 minutes.
