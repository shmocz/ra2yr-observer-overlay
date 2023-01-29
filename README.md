# ra2yr-observer-overlay

Simple browser overlay for Red Alert 2: Yuri's Revenge, using [ra2yrcpp](https://github.com/CnCNet/ra2yrcpp) and [ra2yrproto](https://github.com/shmocz/ra2yrproto). Displays each players' unit counts and build queues in real time.

## Setup

```bash
$ git clone --recurse-submodules https://github.com:shmocz/ra2yr-observer-overlay.git
$ cd ra2yr-observer-overlay
# Generate protobuf definitions
$ npm run prebuild
```

## Usage

Run directly with dev server:

```bash
$ npm run start
```

Alternatively create a production build and place the files under `build/` to suitable location:

```bash
$ npm run build
```
