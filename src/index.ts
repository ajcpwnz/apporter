// hah =:)

// TOOD:
// [x] error handling
// [] req config (type, headers, etc)
// [] meta on result object

import { Keyed, TAssert } from './typings';

type RequestBody = RequestInit['body'] | null | Keyed<any>

interface HttpRequest extends RequestInit {
  params?: Keyed<any>;
  data?: RequestBody;
}

interface HttpClientConfig {
  beforeReq?: (conf: RequestInit) => RequestInit;
}

interface BaseHttpResult {
  success: boolean;
  request: {};
}

export interface SuccessHttpResult<D> extends BaseHttpResult {
  success: true;
  data: D;
}


class SmartError<G> extends Error {
  message: string;

  constructor(error: Error) {
    super();

    this.message = error.message;
  }
}

export interface ErrorHttpResult<E> extends BaseHttpResult {
  success: false;
  error: SmartError<E>;
}

export type HttpResult<S, E> = SuccessHttpResult<S> | ErrorHttpResult<E>

type HttpClientVerbMethod = <S = any, E = any>(path: string, conf?: HttpRequest) => Promise<HttpResult<S, E>>

interface IHttpClient {
  get: HttpClientVerbMethod;
  post: HttpClientVerbMethod;
  put: HttpClientVerbMethod;
  del: HttpClientVerbMethod;
  head: HttpClientVerbMethod;
  patch: HttpClientVerbMethod;
}

interface ErrorResponse {
  failed: true;
  ok: false,
  error: Error
}

export class Apporter implements IHttpClient {
  baseUrl: string;
  beforeReq?: (conf: RequestInit) => RequestInit;

  constructor(baseUrl?: string, config?: HttpClientConfig) {
    this.baseUrl = baseUrl || window.location.origin;

    this.beforeReq = config?.beforeReq;
  }

  private static async prep<S, E>(response: Response | ErrorResponse): Promise<HttpResult<S, E>> {
    if (response.hasOwnProperty('error')) {
      TAssert<ErrorResponse>(response);

      return {
        success: false,
        error: new SmartError<E>(response.error),
        request: {},
      };
    }

    TAssert<Response>(response);

    let data: any;

    try {
      data = await response.clone().json();
    } catch (e) {
      const message = await response.clone().text();

      data = {
        message,
      };
    }


    if (response.ok) {
      return {
        success: true,
        request: {},
        data,
      };
    } else {
      return {
        success: false,
        error: data,
        request: {},
      };
    }
  }

  private static dataToBody(method?: string, data?: RequestBody) {
    if (!data) {
      return null;
    }

    if (
      (typeof data === 'string')
      || (data instanceof ArrayBuffer)
      || (data instanceof Blob)
      || (data instanceof URLSearchParams)
      || (data instanceof ReadableStream)
      || (data instanceof FormData)
      || ArrayBuffer.isView(data)
    ) {
      return data;
    }


    if (method === 'get' || method === 'head') {
      const params = new URLSearchParams();

      Object.entries(data).forEach(([key, value]) => {
        if(Array.isArray(value)) {
          value.forEach(arrayValue => params.append(key, arrayValue))
        } else {
          params.append(key, value)
        }
      })

      return params;
    } else {
      return JSON.stringify(data, null, 2);
    }
  }

  private prepareRequestInit(path: string, rawConf: HttpRequest) {
    let uri = path;

    let conf: Partial<RequestInit> = {
      method: rawConf.method,
    };

    conf.body = Apporter.dataToBody(rawConf.method, rawConf.data);

    if (conf.body && (rawConf.method === 'get' || rawConf.method === 'head')) {
      TAssert<URLSearchParams | string>(conf.body);

      uri = `${uri}?${conf.body.toString()}`;
      conf.body = null;
    }

    if(this.beforeReq) {
      conf = this.beforeReq(conf)
    }

    return {
      uri,
      conf,
    };
  }

  private static configWithVerb(method: string, rawConf?: HttpRequest) {
    if (!rawConf) return { method };
    rawConf.method = method;
    return rawConf;
  }

  private async req<S, E>(path: string, rawConf: HttpRequest) {
    let url = path.match(/https?:\/\/(.+)/g) ? path : `${this.baseUrl}/${path}`;

    let response: Response | ErrorResponse;

    const requestPrep = this.prepareRequestInit(url, rawConf);

    try {
      response = await fetch(requestPrep.uri, requestPrep.conf);
    } catch (e) {
      response = { failed: true, ok: false, error: e };
    }

    return await Apporter.prep<S, E>(response);
  }

  // utility;
  get = <S, E>(path: string, conf?: HttpRequest) => this.req<S, E>(path, Apporter.configWithVerb('get', conf));
  post = <S, E>(path: string, conf?: HttpRequest) => this.req<S, E>(path, Apporter.configWithVerb('post', conf));
  put = <S, E>(path: string, conf?: HttpRequest) => this.req<S, E>(path, Apporter.configWithVerb('put', conf));
  patch = <S, E>(path: string, conf?: HttpRequest) => this.req<S, E>(path, Apporter.configWithVerb('patch', conf));
  del = <S, E>(path: string, conf?: HttpRequest) => this.req<S, E>(path, Apporter.configWithVerb('delete', conf));
  head = <S, E>(path: string, conf?: HttpRequest) => this.req<S, E>(path, Apporter.configWithVerb('head', conf));
}
