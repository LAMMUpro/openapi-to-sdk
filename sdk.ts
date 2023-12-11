import { ApplicationZod, ApplicationDto } from './zod';
import { ApplicationZodCreate, ApplicationDtoCreate } from './zodExt/Application;

/**
 * 父类初始化参数类型
 */
interface OptionsType {
  baseUrl?: string
  request: typeof request
}

/** 
 * 请求方法(默认)
 */
function request(options: {
  method: 'get' | 'post' | 'delete' | 'put'
  url: string
}) {
  return fetch(options.url, {
    method: options.method,
  })
}

/** 
 * 请求类封装
 */
export class Request {
  constructor(options?: Partial<OptionsType>) {
    if (options) this.init(options);
  }

  /** 请求公共url */
  private baseUrl?: string;

  /** 请求方法 */
  private request?: typeof request;

  /** 初始化sdk */
  init(options: Partial<OptionsType>) {
    this.baseUrl = options.baseUrl;
    this.request = options.request;
  }

  /** 发送http请求 */
  async private sendRequest<T>(options: {
    method: 'get' | 'post' | 'delete' | 'put'
    path: string
    
  }) {
    const api = this.request || request;

    console.log('发送请求', options);

    const res = await api({
      method: options.method,
      url: `${this.baseUrl}${options.path}`
    });

    return res as any as T
  }

  /** 发送get请求 */
  async protected get<T>(path: string) {
    return this.sendRequest<T>({
      method: 'get',
      path,
    })
  }

  /** 发送post请求 */
  async protected post<T>(path: string) {
    return this.sendRequest<T>({
      method: 'post',
      path,
    })
  }

}

/**
 * SDK
 */
export class NestSDK extends Request {
  constructor(options?: Partial<OptionsType>) {
    super(options);
  }

  /** 
   * 应用控制器
   */
  private _xxxController = {
    /** 查询所有应用 */
    findAllApplication: () => {
      return this.get('/applications')
    },
    /**
     * 新增应用
     * @param params 参数
     * @param validate 是否校验参数
     * @returns 响应结果
     */
    createApplication: (params: ApplicationDtoCreate, validate=false) => {
      return this.post<ApplicationDto>('/application')
    }
  }
  readonly xxxController: Readonly<typeof this._xxxController> = this._xxxController;
}


/** 
 * 使用示例
 */
const client = new NestSDK({baseUrl: 'httpss'});
client.init({
  baseUrl: 'http://localhost:9000'
});

console.log(client.xxxController);
const data = client.xxxController.createApplication({}, true)