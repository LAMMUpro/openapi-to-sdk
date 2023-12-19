import { ApplicationZod, ApplicationDto } from './zod';
import { ApplicationZodCreate, ApplicationDtoCreate } from './zodExt/Application;

/**
 * 基础对象
 */
interface BaseObj<T = any> {
  [key: string]: T;
}

/**
 * 请求类初始化参数类型
 */
interface RequestInitType {
  /** 请求url中的baseUrl */
  origin?: string
  /** 自定义请求函数, 默认使用fetch */
  request: typeof _fetch_
}

/**
 * 请求参数
 */
interface RequestType {
  /** 请求方法 */
  method: 'get' | 'post' | 'delete' | 'put'
  /** 路径(不包含origin) */
  path: string
  /** 路径参数 */
  query?: BaseObj
  /** body参数 */
  data?: any
  /** 请求头 */
  headers?: BaseObj
}

/** 
 * 请求方法(默认)
 * 带请求结果处理过程
 */
async function _fetch_<T>(options: RequestType) {
  const res = await fetch(options.path, options);
  //TODO
  const result: T = await res.json();
  return result;
}

/** 
 * 请求类封装
 */
export class Request {
  constructor(options?: Partial<RequestInitType>) {
    if (options) this.init(options);
  }

  /** 请求baseUrl */
  private origin?: string;

  /** 请求方法, 带请求结果处理过程 */
  private request = _fetch_;

  /** 初始化sdk */
  init(options: Partial<RequestInitType>) {
    this.origin = options.origin;
    this.request = options.request || _fetch_;
  }

  /** 发送http请求 */
  async protected sendRequest<T>(options: RequestType) {
    const res = await this.request<T>({
      ...options,
      path: `${this.origin}${options.path}`
    });
    //TODO 处理结果
    return res;
  }
}

/**
 * SDK
 */
export class NestSDK extends Request {
  constructor(options?: Partial<RequestInitType>) {
    super(options);
  }

  /** 
   * 应用控制器
   */
  private _xxxController = {
    /** 查询所有应用 */
    findAllApplication: () => {
      return this.sendRequest({
        method: 'get',
        path: '/applications',
        query: {
          a: 1,
        }
      })
    },
    /**
     * 新增应用
     * @param query 参数
     * @param validate 是否校验参数
     * @returns 响应结果
     */
    createApplication: (query: ApplicationDtoCreate, data: ApplicationDtoCreate, validate=false) => {
      return this.sendRequest<ApplicationDto>({
        method: 'post',
        path: '/application/{id}',
        query: {
          a: 1,
        },
        data: {
          b: 'b',
        }
      })
    }
  }
  readonly xxxController: Readonly<typeof this._xxxController> = this._xxxController;
}


/** 
 * 使用示例
 */
const client = new NestSDK({origin: 'httpss'});
client.init({
  origin: 'http://localhost:9000'
});

console.log(client.xxxController);
const data = client.xxxController.createApplication({}, true)