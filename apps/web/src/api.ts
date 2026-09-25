import { Config, ConfigProvider, Context, Effect, Layer, Schema } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import {
  RpcClient,
  RpcClientError,
  RpcSerialization,
} from 'effect/unstable/rpc'

import { ApiRpcs } from '@echo/api/rpcs'

/** The typed RPC client for every procedure the API Worker serves. */
export class ApiClient extends Context.Service<
  ApiClient,
  RpcClient.FromGroup<typeof ApiRpcs, RpcClientError.RpcClientError>
>()('@echo/web/ApiClient') {}

const ApiUrl = Config.schema(Schema.URLFromString, 'VITE_API_URL')

const ProtocolLive = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* ApiUrl.pipe(
      Effect.provide(
        ConfigProvider.layer(
          // NOTE: Alchemy injects the URL as a Vite `define`, which only replaces this exact static property access.
          ConfigProvider.fromUnknown({
            VITE_API_URL: import.meta.env.VITE_API_URL,
          }),
        ),
      ),
    )

    return RpcClient.layerProtocolHttp({ url: url.href })
  }),
).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]))

/** The API client over HTTP, addressed by the build-time `VITE_API_URL`. A missing or malformed URL is a startup defect. */
export const ApiClientLive = Layer.effect(
  ApiClient,
  RpcClient.make(ApiRpcs),
).pipe(Layer.provide(ProtocolLive), Layer.orDie)
