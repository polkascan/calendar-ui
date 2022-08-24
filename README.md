# Calendar UI

Polkascan Calendar UI frames Polkadot as a clock and presents future multichain events on a single Calendar. Polkascan Foundation's
hosted instance of Calendar UI can be found at: [calendar.polkascan.io](https://calendar.polkascan.io).

![image](https://user-images.githubusercontent.com/14069142/162911497-be1db769-4e0d-41fe-982a-8b1773fc5c05.png)

## Architecture

Calendar UI is a client-sided [Angular](https://angular.io/) based application that
utilizes [PolkADAPT](https://github.com/polkascan/polkadapt) and its Adapters to obtain data from multiple data sources. Its design is based
on flat [Material](https://material.angular.io/) component design, styled in Polkascan branding.

## Configuration file

You will need to add a file named `config.json` in `src/assets/`. This file contains configuration per network for the
used [PolkADAPT](https://github.com/polkascan/polkadapt) adapters.

The order in which the networks are shown in the UI is also based on this configuration. It is advised to add multiple endpoints for
fallback and custom switching capabilities.

```shell
  {
  "network": {
    "polkadot": {
      "name": "Polkadot",
      "defaultActive": true,
      "color": "#e6007a",
      "logo": "/assets/logos/polkadot-circle.svg",
      "substrateRpcUrls": {
        "Parity": "wss://rpc.polkadot.io",
        "OnFinality": "wss://polkadot.api.onfinality.io/public-ws",
      },
      "parachains": {
        "statemint": {
          "paraId": 1000,
          "color": "#86e62a",
          "name": "Statemint",
          "common": true,
          "logo": "/assets/logos/statemine.svg",
          "substrateRpcUrls": {
            "Parity": "wss://statemint-rpc.polkadot.io",
            "OnFinality": "wss://statemint.api.onfinality.io/public-ws",
            "Dwellir": "wss://statemint-rpc.dwellir.com",
            "Pinknode": "wss://public-rpc.pinknode.io/statemint"
          }
        },
        "someOtherChain": {
          "homepage": "https://some.network/",
          "defaultActive": true,
          "color": "#645AFF",
          "paraId": 2000,
          "name": "someChain",
          "logo": "/assets/logos/someChain.svg",
          "substrateRpcUrls": {
            "someChain": "wss://some-other-chain.io/public-ws",
          }
        }
      }
    },
    "kusama": {
      "name": "Kusama",
      "defaultActive": true,
      "color": "#000000",
      "logo": "/assets/logos/kusama-128.gif",
      "substrateRpcUrls": {
        "Parity": "wss://kusama-rpc.polkadot.io",
        "OnFinality": "wss://kusama.api.onfinality.io/public-ws",
        "Dwellir": "wss://kusama-rpc.dwellir.com",
        "RadiumBlock": "wss://kusama.public.curie.radiumblock.co/ws",
        "Pinknode": "wss://public-rpc.pinknode.io/kusama"
      },
      "parachains": {
        "statemine": {
          "color": "#113911",
          "paraId": 1000,
          "name": "Statemine",
          "common": true,
          "logo": "/assets/logos/statemine.svg",
          "substrateRpcUrls": {
            "Parity": "wss://statemine-rpc.polkadot.io",
            "OnFinality": "wss://statemine.api.onfinality.io/public-ws",
          }
        }
      }
    }
  }
  "calendarApiUrlArray": {}
}
```

## Build and run with Docker

If you want a quick and easy way to run the application, you can build a [Docker](https://www.docker.com/get-started) image with the
included Dockerfile. In a shell, from this project's directory, run the following command to build the Docker image:

```shell
docker build -t calendar-ui .
```

To run the image and start a local webserver with the application:

```shell
docker run --rm -p 8000:80 calendar-ui
```

You can now open your web browser and navigate to `http://localhost:8000/` to visit the application.

## Build manually

These are the instructions for a manual build. It is advised to use the latest Node LTS. Or at least the node version asked
by [Angular](https://angular.io/) or [Polkadot JS](https://polkadot.js.org/):

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
