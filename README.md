# Calendar UI

Calendar UI is a client-sided [Angular](https://angular.io/) based application that utilizes [PolkADAPT](https://github.com/polkascan/polkadapt) and its Adapters to obtain data from multiple data sources. Its design is based on flat [Material](https://material.angular.io/) component design, styled in Polkascan branding.

## Configuration file

You will need to add a file named `config.json` in `src/assets/`. This file contains configuration per network for the used [PolkADAPT](https://github.com/polkascan/polkadapt) adapters.

The order in which the networks are shown in the UI is also based on this configuration. It is advised to add multiple endpoints for fallback and custom switching capabilities.

```shell
  {
  "network": {
    "polkadot": {
      "substrateRpcUrlArray": ["wss://rpc.polkadot.io"]
    },
    "kusama": {
      "substrateRpcUrlArray": ["wss://kusama-rpc.polkadot.io", "wss://other-kusama-node.io"]
    }
  },
  "calendarApiUrlArray": []
}
```

## Build and run with Docker

If you want a quick and easy way to run the application, you can build a [Docker](https://www.docker.com/get-started) image with the included Dockerfile. In a shell, from this project's directory, run the following command to build the Docker image:

```shell
docker build -t calendar-ui .
```
To run the image and start a local webserver with the application:
```shell
docker run --rm -p 8000:80 explorer-ui
```
You can now open your web browser and navigate to `http://localhost:8000/` to visit the application.

## Build manually

These are the instructions for a manual build. It is advised to use the latest Node LTS. Or at least the node version asked by [Angular](https://angular.io/) or [Polkadot JS](https://polkadot.js.org/):

```shell
npm i
npm run build
```
The build artifacts will be stored in the `dist/` directory.

## Development server

For a dev server, open a terminal and run:
```shell
npm i
npm run start
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.
