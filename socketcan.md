# SocketCAN

aaaaaaaa

> 이 글은 [https://www.kernel.org/doc/Documentation/networking/can.txt](https://www.kernel.org/doc/Documentation/networking/can.txt) 문서에 대한 번역입니다.

Controller Area Network(CAN) 프로토콜 패밀리(속칭 SocketCAN)에 대한 readme 파일

## 개요 / SocketCAN이란 무엇인가?
-------------------------

socketcan 패키지는 CAN(Controller Area Network) 프로토콜을 Linux 용으로 구현 한 것입니다. CAN은 자동화, 임베디드 장치 및 자동차 분야에서 광범위하게 사용되는 네트워킹 기술입니다. Character devices 기반의 Linux에서 여러 다른 CAN 구현이 있었지만, SocketCAN은 Berkeley socket API와 Linux network stack을 사용하여 CAN 장치 드라이버를 네트워크 인터페이스 처럼 구현합니다. CAN 소켓 API는 네트워크 프로그래밍에 익숙한 프로그래머가 CAN 소켓 사용법을 쉽게 배울 수 있도록 TCP/IP 프로토콜과 가능한 유사하게 설계되었습니다.

## 동기 부여 / socket API를 사용하는 이유
-------------------------

SocketCAN 이전에 다른 Linux용 CAN 구현이 있었기 때문에 질문이 생겼습니다. 왜 우리는 다른 프로젝트를 시작했을까? 기존에는 대부분 CAN 하드웨어용 장치 드라이버로 구현되었고, 드라이버는 charater device를 기반으로 하며, 비교적 적은 기능만을 제공합니다. 일반적으로, 원시 CAN 프레임을 controller 하드웨어로 직접 보내거나 받는 특정 하드웨어 전용 드라이버만 있습니다. 

[ISO-TP](https://en.wikipedia.org/wiki/ISO_15765-2)와 같은 고레벨 전송 프로토콜과 프레임 queue는 어플리케이션 레벨에서 구현해야 합니다. 또한, 대부분의 character-device는 시리얼 인터페이스와 비슷하게 장치를 열기 위해 한번에 하나의 프로세스만을 지원합니다. 따라서, CAN 컨트롤러를 변경하려면 다른 장치 드라이버를 사용해야 하며 새로운 드라이버 API를 적용하는 것이 어플리케이션의 큰 부분이 될 수 있습니다.

SocketCAN은 이러한 모든 한계를 극복하도록 설계되었습니다. 새로운 프로토콜 패밀리는 사용자 어플리케이션 레벨에 소켓 인터페이스와 Linux 네트워크 계층의 모든 queue 기능을 제공합니다. CAN 컨트롤러 하드웨어 드라이버는 Linux 네트워크 레이어의 네트워크 장치로 등록되므로, 컨트롤러로 전송된 프레임은 네트워크 레이어를 통해 CAN 프로토콜 패밀리로 전달되며, 반대의 경우도 마찬가지 입니다. 또한, 프로토콜 패밀리 모듈은 전송 프로토콜 모듈을 등록하기 위한 API를 제공하므로 여러개의 전송 프로토콜을 동적으로 로드하거나 언로드할 수 있습니다. 사실, can 코어 모듈은 어떤 프로토콜도 제공하지 않으며, 최소 하나의 추가 프로토콜 모듈을 로드해야 사용할 수 있습니다. 

동시에 다양한 프로토콜 모듈의 소켓을 열 수 있고, 각 소켓들은 같거나 다른 CAN ID를 가지는 CAN 프레임을 송수신할 수 있습니다. CAN 프레임은 동일한 CAN ID를 수신 대기(listen)하는 소켓에 모두 전송됩니다. 특정 전송 프로토콜을(예를들어 [ISO-TP](https://en.wikipedia.org/wiki/ISO_15765-2)) 사용하여 통신하려는 어플리케이션은 소켓을 열때 프로토콜만 선택하면 CAN-ID나 프레임 등을 처리하지 않고도 데이터 바이트 스트림을 읽고 쓸 수 있습니다.

Character device에서도 비슷하게 제공할 수는 있지만 다음의 몇 가지 이유 때문에 기술적으로는 좋지 않은 해결책일 수 있습니다:

* **사용법이 복잡함.** CAN 인터페이스와 CAN ID를 선택하기 위해 프로토콜 인자를 [socket(2)](http://man7.org/linux/man-pages/man2/socket.2.html)과 [bind(2)](http://man7.org/linux/man-pages/man2/bind.2.html)에 전달하는 대신에 [ioctl(2)](http://man7.org/linux/man-pages/man2/ioctl.2.html)을 사용하여 모든 작업을 수행해야 합니다.
* **코드 중복.** charater device는 Linux 네트워크 큐에 대한 코드를 사용할 수 없기 때문에, 이런 코드를 CAN 네트워킹 용으로 복사해야 합니다.
* **추상화.** 대부분의 character-device는 어플리케이션에서 CAN 컨트롤러를 직접 제어하기 위한 특정 하드웨어 드라이버를 제공합니다. 이것은 Unix 시스템에서 block device와 chracter device 모두에 대해 매우 드문 경우입니다. 예를 들어, 당신은 시리얼 인터페이스의 특정 UART, 특정 사운드 칩, 하드디스크를 접근하기 위한 SCSI나 IDE 컨트롤러를 가진 character-device를 가지고 있지 않습니다. 대신에 character device나 block device를 통합하여 어플리케이션 인터페이스를 제공하는 추상화 계층을 가집니다. 이러한 추상화는 tty 계층, 오디오 서브시스템, SCSI와 IDE 서브시스템과 같은 서브시스템에 의해 제공됩니다.
  
  CAN 장치 드라이버를 구현하는 가장 쉬운 방법은 대부분의 기존 드라이버와 같이 (완벽한) 추상화 계층이 없는 chracter device로 만드는 것입니다. 하지만, 제대로 된 방법은 특정 CAN ID의 등록, 여러 개의 파일 디스크립터, CAN 프레임의 (de)multiplexing 및 (정교한) queue 작업과 같은 기능을 포함하는 레이어를 추가하고 등록할 장치 드라이버용 API를 제공하는 것입니다. 하지만, Linux 커널에서 제공하는 네트워킹 프레임워크를 사용하는 것이 더 쉬울 수도 있습니다. 그리고 이것이 SocketCAN이 하는 일입니다.

  Linux 커널의 네트워킹 프레임워크를 사용하는 것은 Linux에서 CAN을 구현하는 가장 자연스럽고 적절한 방법입니다.

## SocketCAN 개념
-------------------------

2장에서 설명한대로 SocketCAN의 주 목표는 어플리케이션 영역에 Linux 네트워크 계층을 기반으로 하는 소켓 인터페이스를 제공하는 것입니다. 일반적인 TCP/IP 및 이더넷 네트워킹과는 달리, CAN 버스는 이더넷과 같은 MAC-계층 어드레스지정이 없는 **브로드캐스트 전용** 매체입니다. CAN 식별자(`can_id`)는 CAN 버스에서 중재(arbitration)를 위해 사용됩니다. 따라서, CAN-ID는 버스상에서 유일해야 합니다. CAN-ECU 네트워크를 설계할 때 CAN-ID는 특정 ECU에 매핑됩니다.

이러한 이유 때문에 CAN-ID는 일종의 소스 어드레스로 취급할 수 있습니다.

### 수신 목록

여러 어플리케이션이 네트워크에 접근하면서 같은 CAN 네트워크 인터페이스를 통해 동일한 CAN-ID를 가지는 데이터에 관심을 가지는 문제가 발생합니다. SocketCAN 코어 모듈은 이런 이유로 여러가지 고효율의 수신 목록을 제공합니다. 예를 들어, 만약 유저 어플리케이션이 CAN RAW 소켓을 열었다면 raw 프로토콜 모듈은 SocketCAN 코어 모듈에게 유저가 요청한 CAN-ID (범위)를 요청합니다. CAN-ID의 등록과 해지는 특정 CAN 인터페이스 혹은 **알려진 모든** 인터페이스에서 CAN 프로토콜 모듈에서 제공하는 `can_rx_(un)register()` 함수를 통해 가능합니다([SocketCAN 코어 모듈](#socketcan-코어-모듈) 참조).

런타임시 CPU 사용을 최적화하기 위해 수신 목록은 use-case에 따라 요청한 필터와 일치하는 장치별 목록으로 분할됩니다.

### 전송 프레임의 로컬 루프백

다른 네트워킹 개념에서 알 수 있듯이 데이터 교환 어플리케이션은 어떤 변경없이 같거나 다른 노드에서 실행할 수 있습니다(어드레스 정보를 따르는 경우를 제외하고).

```
         ___   ___   ___                   _______   ___
        | _ | | _ | | _ |                 | _   _ | | _ |
        ||A|| ||B|| ||C||                 ||A| |B|| ||C||
        |___| |___| |___|                 |_______| |___|
          |     |     |                       |       |
        -----------------(1)- CAN bus -(2)---------------
```

어플리케이션 A가 *(1)*에서 수신한 것과 동일한 정보를 *(2)*에서 수신할 수 있도록 하려면 적절한 노드에서 전송된 CAN 프레임을 로컬 루프백할 필요가 있습니다.

Linux (기본)네트워크 장치는 미디어 종속적인 프레임의 전송 및 수신만 처리할 수 있습니다. CAN 버스에서는 우선순위가 낮은 CAN-ID 프레임은 우선순위가 높은 CAN-ID 프레임보다 전송이 지연될 수 있습니다. 노드상에 올바른 트래픽을 반영하기 위해서 데이터의 루프백은 전송이 성공적으로 이루어진 후 즉시 수행되어야 합니다. 만약 CAN 네트워크 인터페이스가 어떤 이유로 루프백을 수행할 수 없다면 SocketCAN 코어가 대체 방법으로 이 작업을 수행합니다. 자세한 내용은 6.2장을 참조하세요(권장).

루프백 기능은 CAN 어플리케이션의 표준 네트워크 동작을 반영하기 위해 기본적으로 활성화되어 있습니다. RT-SocketCAN 그룹의 요청으로 개별소켓의 루프백을 비활성화할 수 있습니다. 4.1장의 CAN RAW 소켓의 `sockopts`을 참조하세요.

* (동일한) 노드에서 `candump`또는 `cansniffer`와 같은 분석 도구를 실행하는 경우에 이 기능을 사용하는 것이 좋습니다.

### 네트워크 문제 알림

CAN 버스 사용시 물리적 레이어나 미디어 엑세스 컨트롤 레이어에 몇몇 문제가 발생할 수 있습니다. 이러한 하위 계층의 문제를 감지하고 로깅하는 것은 CAN 사용자가 물리적 트랜시버 레이어의 이슈를 식별하거나 다른 ECU 때문에 발생하는 오류프레임을 식별하는데 매우 중요합니다. 정확한 타임스템프가 있는 오류감지는 진단시 유용합니다. 이러한 이유로 CAN 인터페이스 드라이버는 에러 메시지라 불리는 프레임을 생성하며, 이것은 CAN 프레임과 동일한 방법으로 사용자 어플리케이션에 전달이 가능합니다. 물리 계층이나 MAC 계층에서 (CAN 컨트롤러에 의해)에러가 검출 될 때마다, 드라이버는 적절한 에러 메시지 프레임을 생성합니다. 에러 메시지 프레임은 일반적인 CAN 필터링 매커니즘을 이용하여 사용자 어플리케이션에서 요청할 수 있습니다. 필터 정의에서 (관심있는)오류 타입을 선택할 수 있습니다. 오류 메시지의 수신은 기본적으로 비활성화 되어 있습니다.

CAN 에러 메시지 프레임의 포맷은 리눅스 헤더파일 [`include/uapi/linux/can/error.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can/error.h)에 간략히 설명되어 있습니다.

## SocketCAN 사용 방법
-------------------------

CAN 네트워크를 통한 통신을 위해 먼저 TCP/IP와 같이 소켓을 열 필요가 있습니다. SocketCAN의 새로운 프로토콜 패밀리이기 때문에 [socket(2)](http://man7.org/linux/man-pages/man2/socket.2.html) 시스템 콜의 첫 번째 인자로 `PF_CAN`을 넘겨야 합니다. 현재는 두가지 CAN 프로토콜(raw 소켓 프로토콜, broadcast manager(BCM))을 선택할 수 있습니다. 따라서, 소켓을 열기 위해 각각 다음과 같이 작성합니다.

```c
s = socket(PF_CAN, SOCK_RAW, CAN_RAW);
```

또는

```c
s = socket(PF_CAN, SOCK_DGRAM, CAN_BCM);
```
소켓을 성공적으로 생성 한 후에는 일반적으로 [bind(2)](http://man7.org/linux/man-pages/man2/bind.2.html) 시스템 콜을 사용하여 소켓을 CAN 인터페이스에 바인딩합니다(주소 지정 방식이 다르기 때문에 TCP/IP와는 다릅니다 - 3장 참조). 소켓을 바인딩(`CAN_RAW`)하거나 커넥팅(`CAN_BCM`)한 후에는 소켓을 통해 [read(2)](http://man7.org/linux/man-pages/man2/read.2.html), [write(2)](http://man7.org/linux/man-pages/man2/write.2.html)하거나 [send(2), sendto(2), sendmsg(2)](http://man7.org/linux/man-pages/man2/send.2.html) 및 그에 대응되는 [recv*](http://man7.org/linux/man-pages/man2/recv.2.html) 동작들을 수행할 수 있습니다. 또한, 뒤에 설명할 CAN 전용 소켓 옵션도 있습니다.

CAN 프레임과 `sockaddr`의 기본 구조는 [`include/linux/can.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can.h)에 정의되어 있습니다.

```c
struct can_frame {
    canid_t can_id;  /* 32 bit CAN_ID + EFF/RTR/ERR flags */
    __u8    can_dlc; /* frame payload length in byte (0 .. 8) */
    __u8    __pad;   /* padding */
    __u8    __res0;  /* reserved / padding */
    __u8    __res1;  /* reserved / padding */
    __u8    data[8] __attribute__((aligned(8)));
};
```

64비트 (선형)페이로드 data[]의 정렬은 사용자가 자신의 구조체(struct) 및 공용체(union)를 정의하여 쉽게 접근이 가능합니다. 기본적으로 CAN 버스는 지정된 바이트 순서가 없습니다. `CAN_RAW` 소켓에서 read(2) 시스템 콜을 호출하면 사용자 영역에 `can_frame`을 전송합니다.

`sockaddr_can` 구조체는 `PF_PACKET` 소켓과 같은 인터페이스 인덱스를 가지고 있으며, 이것은 역시 특정 인터페이스와 바인딩됩니다:

```c
struct sockaddr_can {
    sa_family_t can_family;
    int         can_ifindex;
    union {
        /* transport protocol class address info (e.g. ISOTP) */
        struct { canid_t rx_id, tx_id; } tp;

        /* reserved for future CAN protocols address information */
    } can_addr;
};
```

인터페이스 인덱스를 결정하기 위해서 [ioctl()](http://man7.org/linux/man-pages/man2/ioctl.2.html)를 적절히 사용합니다(에러 검사없이 `CAN_RAW` 소켓을 사용하는 예제):

```c
int s;
struct sockaddr_can addr;
struct ifreq ifr;

s = socket(PF_CAN, SOCK_RAW, CAN_RAW);

strcpy(ifr.ifr_name, "can0" );
ioctl(s, SIOCGIFINDEX, &ifr);

addr.can_family = AF_CAN;
addr.can_ifindex = ifr.ifr_ifindex;

bind(s, (struct sockaddr *)&addr, sizeof(addr));

(..)
```

소켓에 **모든** CAN 인터페이스를 바인딩 하려면 인터페이스 인덱스는 **0**(zero)이어야 합니다. 이 경우 소켓은 가능한 모든 CAN 인터페이스로부터 CAN 프레임을 수신합니다. 프레임을 받기위한 CAN 인터페이스를 결정하기 위해 **read(2)** 대신 **recvfrom(2)** 시스템 콜을 사용합니다. 보낼 인터페이스를 지정하려면 **sendto(2)**를 사용합니다.

바인딩된 `CAN_RAW` 소켓에서 CAN 프레임을 읽으려면 `can_frame` 구조체를 읽습니다:

```c
struct can_frame frame;

nbytes = read(s, &frame, sizeof(struct can_frame));

if (nbytes < 0) {
    perror("can raw socket read");
    return 1;
}

/* paranoid check ... */
if (nbytes < sizeof(struct can_frame)) {
    fprintf(stderr, "read: incomplete CAN frame\n");
    return 1;
}

/* do something with the received CAN frame */
```

비슷하게 **write(2)** 시스템 콜을 사용하여 CAN 프레임을 쓸 수 있습니다:

```
nbytes = write(s, &frame, sizeof(struct can_frame));
```

존재하는 **모든** CAN 인터페이스에 바인딩된 경우(`addr.can_ifindex = 0`) 프레임을 보낸 CAN 인터페이스에 대한 정보가 필요하다면 **recvfrom(2)**을 사용하는 것이 좋습니다:

```c
struct sockaddr_can addr;
struct ifreq ifr;
socklen_t len = sizeof(addr);
struct can_frame frame;

nbytes = recvfrom(s, &frame, sizeof(struct can_frame),
                  0, (struct sockaddr*)&addr, &len);

/* get interface name of the received CAN frame */
ifr.ifr_ifindex = addr.can_ifindex;
ioctl(s, SIOCGIFNAME, &ifr);
printf("Received a CAN frame from interface %s", ifr.ifr_name);
```

**모든** CAN 인터페이스에 바인딩 된 소켓에 CAN 프레임을 작성하려면 발신 인터페이스를 확실히 정의해야합니다.

```c
strcpy(ifr.ifr_name, "can0");
ioctl(s, SIOCGIFINDEX, &ifr);
addr.can_ifindex = ifr.ifr_ifindex;
addr.can_family  = AF_CAN;

nbytes = sendto(s, &frame, sizeof(struct can_frame),
                0, (struct sockaddr*)&addr, sizeof(addr));
```

정확한 타임스탬프는 소켓에서 메시지를 읽은 후 [ioctl(2)](http://man7.org/linux/man-pages/man2/ioctl.2.html)를 호출하여 얻을 수 있습니다:

```c
struct timeval tv;
ioctl(s, SIOCGSTAMP, &tv);
```

타임 스탬프는 1마이크로 초의 분해능을 가지며 CAN 프레임 수신시 자동으로 설정됩니다.

> **CAN FD (flexible data rate) 지원에 대해:**
>
> 일반적으로 CAN FD의 처리는 이전에 설명한 예제들과 거의 유사합니다. 새로운 CAN FD 호환 CAN 컨트롤러는 중재(arbitration) 단계와 페이로드 페이즈를 위해 두가지 비트레이트를 지원하며 64비트 페이로드를 지원합니다. 확장된 페이로드의 길이는 CAN_RAW 소켓과 같이 8바이트로 고정된 페이로드를 가지는 CAN 프레임(struct `can_frame`)에 의존적인 모든 커널 인터페이스(ABI)와 맞지 않습니다. 따라서, CAN_RAW 소켓은 CAN FD 프레임과 (레거시) CAN 프레임을 동시에 지원하는 모드로 전환하기 위한 새로운 소켓 옵션인 [`CAN_RAW_FD_FRAMES`](#raw-소켓의-can_raw_fd_frames-옵션)을 지원합니다.
>
> `canfd_frame` 구조체는 [`include/linux/can.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can.h)에 정의되어 있습니다:
>
> ```c
struct canfd_frame {
    canid_t can_id;  /* 32 bit CAN_ID + EFF/RTR/ERR flags */
    __u8    len;     /* frame payload length in byte (0 .. 64) */
    __u8    flags;   /* additional flags for CAN FD */
    __u8    __res0;  /* reserved / padding */
    __u8    __res1;  /* reserved / padding */
    __u8    data[64] __attribute__((aligned(8)));
};
```
>
> `canfd_frame` 구조체와 기존의 `can_frame` 구조체는 `can_id`와 페이로드 길이와 페이로드 데이터가 같은 옵셋에 존재합니다. 따라서 다른 구조체지만 비슷하게 처리할 수 있습니다.
> 
> `can_frame`의 내용을 `canfd_frame`으로 복사할 때 `data[]`를 제외한 모든 요소는 그대로 사용가능합니다.
>
> `canfd_frame`으로 변경시에는 `can_frame`의 data length code (DLC)가 데이터 크기 정보로 사용되며 데이터는 0~8바이트에 1:1 매핑됩니다. 데이터 크기 정보를 쉽게 처리하기 위해 `canfd_frame.len`은 0~64의 일반 길이 값이 들어갑니다. 따라서 `canfd_frame.len`과 `can_frame.can_dlc`는 같은 값을 가지며 `canfd_frame`은 dlc가 없습니다.
>
> CAN과 CAN FD 호환 장치의 구별방법 및 버스관련 data length code (DLC)를 매핑하는 방법에 대한 자세한 내용은 [CAN FD 드라이버 지원](#can-fd-flexible-data-rate-드라이버-지원)을 참고하세요.
>
> CAN과 CAN FD 프레임의 길이는 CAN(FD) 네트워크 인터페이스의 maximum transfer unit (MTU)과 skbuff 데이터 길이로 정의됩니다. 두개의 MTU 정의는 [`include/linux/can.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can.h)에 있습니다:
>
>```c
#define CAN_MTU   (sizeof(struct can_frame))   == 16  => '레거시' CAN 프레임
#define CANFD_MTU (sizeof(struct canfd_frame)) == 72  => CAN FD 프레임
```

### RAW 프로토콜 소켓의 `can_filters` (SOCK_RAW)

`CAN_RAW` 소켓을 사용하는 것은 일반적으로 알려진 chracter device에서 CAN에 엑세스하는 방법과 비교할 수 있습니다. SocketCAN의 다중 사용자 지원을 위해 RAW 소켓을 바인딩 할 때 몇 가지 적절한 기본값이 설정됩니다:

- 필터는 모든 것을 수신하는 하나의 필터만 설정됨
- 소켓은 유효한 데이터 프레임만 수신 (에러 메시지 프레임은 수신하지 않음)
- CAN 프레임의 루프백은 활성화 됨([전송 프레임의 로컬 루프백](#전송-프레임의-로컬-루프백) 참고
- 소켓은 자신이 보낸 프레임은 받지 않음(루프백 모드에서)

이러한 기본 설정은 소켓을 바인딩하기 전이나 후에 변경할 수 있습니다. `CAN_RAW` 소켓에 대한 소켓 옵션의 정의를 사용하려면 `<linux/can/raw.h>` 인클루드 하세요.

#### RAW 소켓의 `CAN_RAW_FILTER` 옵션

`CAN_RAW_FILTER` 옵션을 이용한 0~n개의 필터를 정의하여 `CAN_RAW` 소켓을 사용하여 CAN 프레임을 수신하는 것을 제어할 수 있습니다.

CAN 필터 구조체는 [`include/linux/can.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can.h)에 정의되어 있습니다:

```c
struct can_filter {
    canid_t can_id;
    canid_t can_mask;
};
```

필터가 일치하는 경우,

```c
<received_can_id> & mask == can_id & mask
```

이 것은 기존의 CAN 컨트롤러의 하드웨어 필터링 구문과 유사합니다.

`can_filter` 구조체에 `can_id` 엘리먼트에 `CAN_INV_FILTER` 비트를 설정하여 필터를 반전할 수 있습니다. CAN 컨트롤러 하드웨어 필터링과 달리 사용자는 열려있는 소켓마다 별도로 0~n개의 수신 필터를 설정할 수 있습니다:

```c
struct can_filter rfilter[2];

rfilter[0].can_id   = 0x123;
rfilter[0].can_mask = CAN_SFF_MASK;
rfilter[1].can_id   = 0x200;
rfilter[1].can_mask = 0x700;

setsockopt(s, SOL_CAN_RAW, CAN_RAW_FILTER, &rfilter, sizeof(rfilter));
```

선택한 `CAN_RAW` 소켓의 CAN 프레임 수신을 비활성하려면 다음과 같이 작성합니다:

```c
setsockopt(s, SOL_CAN_RAW, CAN_RAW_FILTER, NULL, 0);
```

필터를 제로 필터로 설정하면 데이터를 읽지 않기 때문에 raw 소켓은 수신된 CAN 프레임을 폐기합니다. 하지만 이러한 'send only' 유스케이스는 커널 내의 전송 리스트를 삭제하여 CPU 사용률을 (아주 약간) 줄일 수 있습니다.

##### CAN 필터 사용 최적화

CAN 필터는 CAN 프레임 수신 시점에 장치별 필터 리스트에서 처리됩니다. 필터 리스트를 확인할 때 체크 횟수를 줄이기 위해 CAN 코어 모듈은 하나의 CAN ID에 집중된 필터 등록에 대해 최적화된 필터 처리를 제공합니다. 

2048개의 SFF CAN 식별자의 경우 더이상 체크하지 않고 해당 등록 목록에 접근하기 위한 인덱스로 사용합니다. 2^29개의 EFF CAN 식별자의 경우 10비트 XOR 하여 EFF 테이블 인덱스를 검색하기 위한 해시로 사용합니다.

하나의 CAN 식별자에 대한 최적화된 필터의 장점을 얻으려면 `can_filter.mask`에 `CAN_EFF_FLAG` 및 `CAN_RTR_FLAG` 비트와 함께 `CAN_SFF_MASK`나 `CAN_EFF_MASK`를 설정하여야 합니다. `can_filter.mask`에 `CAN_EFF_FLAG` 비트를 설정하면 위의 예제처럼 `SFF`나 `EFF` CAN ID가 등록되었는지 여부를 명확하게 해줍니다.

```c
rfilter[0].can_id   = 0x123;
rfilter[0].can_mask = CAN_SFF_MASK;
```

이 경우 CAN ID가 `0x123`인 SFF 프레임과 `0xXXXXX123`인 EFF 프레임도 모두 통과할 수 있습니다.

0x123 (SFF)와 0x12345678 (EFF) 인 CAN 식별자만 필터링하려면 최적화된 필터링을 위해 다음과 같이 정의하여야 합니다:

```c
struct can_filter rfilter[2];

rfilter[0].can_id   = 0x123;
rfilter[0].can_mask = (CAN_EFF_FLAG | CAN_RTR_FLAG | CAN_SFF_MASK);
rfilter[1].can_id   = 0x12345678 | CAN_EFF_FLAG;
rfilter[1].can_mask = (CAN_EFF_FLAG | CAN_RTR_FLAG | CAN_EFF_MASK);

setsockopt(s, SOL_CAN_RAW, CAN_RAW_FILTER, &rfilter, sizeof(rfilter));
```

#### RAW 소켓의 `CAN_RAW_ERR_FILTER` 옵션

[네트워크 문제 알림](#네트워크-문제-알림)섹션에서 설명한대로 CAN 인터페이스 드라이버는 에러 메시지 프레임이라 불리는 프레임을 생성하고 다른 CAN 프레임과 동일한 방법으로 사용자 어플리케이션에 전송할 수 있습니다. 오류는 적절한 에러 마스크를 사용하여 필터링이 가능한 여러가지 에러 클래스로 나뉘게 됩니다. 모든 에러를 등록하려면 `CAN_ERR_MASK`를 사용하면 됩니다.

에러 마스크 값은 [`linux/can/error.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can/error.h)에 정의되어 있습니다.

```c
can_err_mask_t err_mask = ( CAN_ERR_TX_TIMEOUT | CAN_ERR_BUSOFF );

setsockopt(s, SOL_CAN_RAW, CAN_RAW_ERR_FILTER,
           &err_mask, sizeof(err_mask));
```

#### RAW 소켓의 `CAN_RAW_LOOPBACK` 옵션

다중 사용자 요구사항을 충족하기 위해 로컬 루프백은 기본적으로 활성화되어 있습니다([전송 프레임의 로컬 루프백](#전송-프레임의-로컬-루프백) 챕터를 참조). 하지만 일부 임베디드 유스케이스(예를 들어, 하나의 어플리케이션만 CAN 버스를 사용할 때)에서 루프백 기능을 비활성 할 수 있습니다(각 소켓별로 가능).

```c
int loopback = 0; /* 0 = disabled, 1 = enabled (default) */

setsockopt(s, SOL_CAN_RAW, CAN_RAW_LOOPBACK, &loopback, sizeof(loopback));
```

#### RAW 소켓의 `CAN_RAW_RECV_OWN_MSGS` 옵션

로컬 루프백이 활성화되면, 전송된 모든 CAN 프레임은 다중 사용자 요구를 만족하기 위해 주어진 인터페이스에서 현재 CAN 프레임의 CAN-ID를 기다리고 있는 CAN 소켓으로 루프백 됩니다. 루프백시 CAN 프레임을 보내는 소켓은 기본적으로 수신이 비활성화되어 있습니다. 이러한 기본설정은 필요에 따라 변경가능합니다:

```c
int recv_own_msgs = 1; /* 0 = disabled (default), 1 = enabled */

setsockopt(s, SOL_CAN_RAW, CAN_RAW_RECV_OWN_MSGS,
           &recv_own_msgs, sizeof(recv_own_msgs));
```

#### RAW 소켓의 `CAN_RAW_FD_FRAMES` 옵션

`CAN_RAW` 소켓은 기본적으로 CAN FD를 지원히지 않습니다. 이를 지원하기 위해 새로운 `CAN_RAW_FD_FRAMES` 옵션을 사용합니다. `CAN_RAW` 소켓에서 이 옵션을 지원하지 않는 경우(예를 들어, 이전 커널) `-ENOPROTOOPT` 에러를 리턴합니다.

`CAN_RAW_FD_FRAMES`이 활성화 되면 어플리케이션은 CAN 프레임과 CAN FD 프레임을 모두 보낼 수 있습니다. 다시 말해서 어플리케이션은 소켓에서 CAN 프레임과 CAN FD 프레임을 모두 읽을 수 있습니다.

* `CAN_RAW_FD_FRAMES` 활성화:  `CAN_MTU`와 `CANFD_MTU` 모두 가능
* `CAN_RAW_FD_FRAMES` 비활성화: `CAN_MTU`만 가능(기본)

예제:

```c
[ remember: CANFD_MTU == sizeof(struct canfd_frame) ]

struct canfd_frame cfd;

nbytes = read(s, &cfd, CANFD_MTU);

if (nbytes == CANFD_MTU) {
    printf("got CAN FD frame with length %d\n", cfd.len);
/* cfd.flags contains valid data */
} else if (nbytes == CAN_MTU) {
    printf("got legacy CAN frame with length %d\n", cfd.len);
/* cfd.flags is undefined */
} else {
    fprintf(stderr, "read: invalid CAN(FD) frame\n");
    return 1;
}

/* the content can be handled independently from the received MTU size */

printf("can_id: %X data length: %d data: ", cfd.can_id, cfd.len);
for (i = 0; i < cfd.len; i++)
    printf("%02X ", cfd.data[i]);
```

`CANFD_MTU` 사이즈로 읽을 경우 FD 프레임은 소켓에서 받은 `CAN_MTU` 바이트만 반환됩니다. 레거시 CAN 프레임이 수신될 경우 데이터를 CAN FD 구조로 읽어 들입니다. `canfd_frame.flags` 데이터 필드는 `can_frame` 구조체에 정의되어 있지 않으므로 `CANFD_MTU` 크기를 가지는 CAN FD 프레임에서만 유효합니다.

> **새로운 CAN 어플리케이션 구현을 위한 힌트:**
>
> CAN FD를 인식하는 어플리게이션을 만들려면 CAN_RAW 기반 어플리케이션의 기본 CAN 데이터 구조로 `canfd_frame` 구조체를 사용하세요. 어플리케이션이 이전 Linux 커널에서 실행되어 `CAN_RAW_FD_FRAMES` 소켓 옵션이 에러를 내더라도 문제 없습니다. 레거시 CAN 프레임과 CAN FD 프레임은 같은 방식으로 처리될 것입니다.
>
> CAN 장치에 전송할 때는 장치의 최대 전송 단위가 CANFD_MTU인지 확인하여 CAN FD 프레임을 처리할 수 있는 장치인지 확인하세요. CAN 장치의 MTU는 예를 들어 `SIOCGIFMTU ioctl()` 시스템 콜로 확인할 수 있습니다.

#### RAW 소켓의 `CAN_RAW_JOIN_FILTERS` 옵션

CAN_RAW 소켓은 [`af_can.c`](http://lxr.free-electrons.com/source/net/can/af_can.c)내의 여러 필터에 따르는 CAN 식별자 별 필터를 여러개 설정할 수 있습니다. 이러한 필터는 서로 독립적이어서 논리 OR로 중첩 적용할 수 있습니다([`CAN_RAW_FILTER` 옵션](#raw-소켓의-can_raw_filter-옵션) 참조)

이러한 소켓 옵션은 적용된 **모든** CAN 필터와 일치하는 CAN 프레임만 사용자 공간에 전달합니다. 따라서, 적용된 필터의 의미는 논리 AND입니다.

이것은 특히 틀어오는 트래픽에서 단일 CAN ID나 특정 CAN ID 범위를 체크하기위해 `CAN_INV_FILTER` 플래그가 설정된 경우에 유용합니다.

#### RAW 소켓이 반환하는 메시지 플래그

`recvmsg()`를 호출할 때 `msg->msg_flags`는 다음과 같은 플래그를 포함할 수 있습니다:

* `MSG_DONTROUTE`: 수신된 프레임이 local host에서 생성되었을 때 설정
* `MSG_CONFIRM`: 수신된 소켓을 통해 프레임이 전송되었을 때 설정. 이 플래그는 CAN 드라이버가 드라이버 레벨에서 echo of frames를 지원할 때 'transmission confirmation'으로 해석할 수 있습니다([SocketCAN개념](#전송-프레임의-로컬-루프백)과 [CAN 네트워크 드라이버](#전송-프레임의-로컬-루프백-1) 챕터를 참고하세요). 이러한 메시지를 수신하려면 `CAN_RAW_RECV_OWN_MSGS`를 설정하여야 합니다.

### Broadcast Manager protocol 소켓 (SOCK_DGRAM)

Broadcast Manager protocol은 커널영역에서 CAN 메시지를 필터링하고 전송(에를 들어, cyclic)하기 위한 command 기반의 구성 인터페이스를 제공합니다.

수신 필터는 빈번한 메시지를 다운 샘플링할 수 있습니다. 필터는 메시지 내용 변경, 패킷 길이 변경 및 수신된 메시지의 타임아웃 모니터링 같은 이벤트를 감지합니다. 

CAN 프레임의 주기적인 전송이나 순서는 런타임에 생성하고 수정할 수 있습니다.

BCM 소켓은 CAN_RAW 소켓의 `can_frame`을 사용하여 개별적인 CAN 프레임을 전송하기 위한 것이 아닙니다. 대신 특별한 BCM 구성 메시지가 정의됩니다. 브로드캐스트 매니저와 통신하는데 사용되는 기본 BCM 구성 메시지는 ['linux/can/bcm.h'](http://lxr.free-electrons.com/source/include/uapi/linux/can/bcm.h)에 정의되어 있습니다. BCM 메시지는 command(`opcode`) 뒤에 0개 이상의 CAN 프레임을 가지는 메시지 헤더로 구성되어 있습니다.

브로드캐스트 매니저는 사용자에게 동일한 형태의 응답을 전송합니다""

```c
struct bcm_msg_head {
    __u32 opcode;                   /* command */
    __u32 flags;                    /* special flags */
    __u32 count;                    /* run 'count' times with ival1 */
    struct timeval ival1, ival2;    /* count and subsequent interval */
    canid_t can_id;                 /* unique can_id for task */
    __u32 nframes;                  /* number of can_frames following */
    struct can_frame frames[0];
};
```
정렬된 페이로드 '프레임들'은 [SocketCAN 사용 방법](#socketcan-사용-방법)의 처음에 정의된 기본 CAN 프레임을 사용합니다. 사용자가 브로드캐스트 매니저로 보내는 모든 메시지도 이 구조를 가집니다.

CAN_BCM 소켓은 생성이 된 후 바인딩(bind) 대신에 커넥트(connect)되어야 합니다. 다음은 에러 검사는 없는 예제입니다:

```c
int s;
struct sockaddr_can addr;
struct ifreq ifr;

s = socket(PF_CAN, SOCK_DGRAM, CAN_BCM);

strcpy(ifr.ifr_name, "can0");
ioctl(s, SIOCGIFINDEX, &ifr);

addr.can_family = AF_CAN;
addr.can_ifindex = ifr.ifr_ifindex;

connect(s, (struct sockaddr *)&addr, sizeof(addr));

(..)
```

브로드캐스트 매니저 소켓은 동작중인 여러개의 전송이나 수신필터를 동시에 처리할 수 있습니다. 서로 다른 RX/TX 작업은 각 BCM 메시지의 유니크한 `can_id`로 구분됩니다. 하지만 추가적인 CAN_BCM 소켓은 다중 CAN 인터페이스 상에서 통신하는 것을 추천합니다.

브로드캐스트 매니저 소켓이 '특정' CAN 인터페이스에 바인딩되면(인터페이스 인덱스는 zero로 설정됨), 수신 필터는 `sendto()` 시스템 콜에서 '특정' CAN 인터페이스의 인덱스를 덮어쓰지 않는 한 모든 CAN 인터페이스에 적용됩니다. BCM 소켓 메시지를 수신할 때 `read()` 대신 `recvfrom()`을 사용하면 오리진 CAN 인터페이스는 `can_ifindex`로 제공됩니다.

#### Broadcast Manager 작업

opcode는 브로드캐스트 관리자가 수행할 작업을 정의하거나, 사용자 요청을 포함한 여러 이벤트에 대한 브로드캐스트 매니저의 응답을 자세히 설명합니다.

**Transmit 작업 (사용자 공간에서 브로드캐스트 매니저로):**

* `TX_SETUP`:   (주기적) transmit task 생성.
* `TX_DELETE`:  (주기적) transmit task 삭제. `can_id`만 필요함.
* `TX_READ`:    `can_id`에 대한 (주기적) transmit task의 속성을 읽어옴.
* `TX_SEND`:    하나의 CAN 프레임 send.

**Transmit 응답 (브로드캐스트 매니저에서 사용자 공간으로):**

* `TX_STATUS`:  `TX_READ` 요청에 대한 응답 (transmission task 구성).
* `TX_EXPIRED`: 카운터가 초기값 `ival1`을 보내 종료할 때 알림. `TX_SETUP`에 `TX_COUNTEVT` 플래그를 설정해야 함

**Receive 작업 (사용자 공간에서 브로드캐스트 매니저로):**

* `RX_SETUP`:   RX 컨텐트 필터 등록을 생성.
* `RX_DELETE`:  RX 컨텐트 필터 등록을 삭제. `can_id`만 필요함
* `RX_READ`:    특정 `can_id`에 대해 등록된 RX 컨텐트 필터의 속성을 읽어옴.

**Receive 응답 (브로드캐스트 매니저에서 사용자 공간으로):**

* `RX_STATUS`:  `RX_READ` 요청에 대한 응답 (filter task 구성)
* `RX_TIMEOUT`: 주기적인 메시지가 없는 것으로 감지됨(타이머 ival1이 만료됨)
* `RX_CHANGED`: 업데이트된 CAN 프레임이 있는 BCM 메시지 (컨텐츠 변경을 감지).
  첫번째 메시지가 수신될 대, 혹은 변경된 CAN 메시지가 수신될 때 전송됩니다.

#### Broadcast Manager의 메시지 플래그

브로드캐스트 매니저에서 메시지를 보낼 때 'flags' 요소에는 다음과 같은 플래그를 포함할 수 있습니다:

* `SETTIMER`:           `ival1`, `ival2`, `count` 설정
* `STARTTIMER`:         `ival1`, `ival2`, `count`의 실제 값으로 타이머를 시작함. 타이머를 시작함과 동시에 CAN 프레임 전송이 시작됩니다.
* `TX_COUNTEVT`:        `count`가 만료되었을 때 `TX_EXPIRED` 메시지를 생성함
* `TX_ANNOUNCE`:        프로세스에 의해 데이터가 변경되면 즉시 전송함
* `TX_CP_CAN_ID`:       메시지 헤더의 `can_id`를 후속프레임으로 복사함. 이것은 사용법을 단순화하기 위한 것입니다. TX task의 경우 메시지 헤더의 고유한 `can_id`는 후속 `can_frame(s)` 구조체에 저장된 `can_id(s)`와 다를 수 있습니다.
* `RX_FILTER_ID`:       프레임을 필요로 하지 않고 `can_id` 만으로 필터링 합니다(nframes=0).
* `RX_CHECK_DLC`:       DLC가 변경되면 `RX_CHANGED`가 발생됩니다.
* `RX_NO_AUTOTIMER`:    타임아웃 모니터가 자동으로 시작되는 것을 막습니다.
* `RX_ANNOUNCE_RESUME`: `RX_SETUP`에서 전달되며 타임아웃이 발생하면, (주기적) 수신이 재시작 할 때 `RX_CHANGED` 메시지가 생성될 것입니다.
* `TX_RESET_MULTI_IDX`: 다중 프레임 전송에 대한 인덱스를 초기화 합니다.
* `RX_RTR_FRAME`:       RTR-request (`op->frames[0]`에 위치)에 대한 응답을 전송합니다.

#### Broadcast Manager의 전송 타이머

주기적인 전송을 구성할 때 두 가지의 타이머를 사용할 수 있습니다. 이 경우 BCM은 `count` 개의 메지시를 `ival1`의 간격으로 보낸 다음 계속해서 `ival2`의 간격으로 전송합니다. 하나의 타이머만 필요할 경우에는 `count`를 0으로 설정하고 `ival2` 값만 사용합니다. `SET_TIMER`와 `START_TIMER` 플래그가 설정되면 타이머는 활성화 됩니다. `SET_TIMER`만 설정되어 있으면 실행중에 타이머 값을 변경 가능합니다.

#### Broadcast Manager의 메시지 시퀀스 전송

주기적 TX task 구성의 경우 하나의 시퀀스에서 최대 256개의 CAN 프레임을 전송할 수 있습니다. CAN 프레임의 갯수는 BCM 메시지 헤더의 `nframes` 요소로 제공됩니다. CAN 프레임 갯수는 `TX_SETUP` BCM 구성 메시지에 배열 형태로 추가됩니다. 

```c
/* create a struct to set up a sequence of four CAN frames */
struct {
    struct bcm_msg_head msg_head;
    struct can_frame frame[4];
} mytxmsg;

(..)
mytxmsg.msg_head.nframes = 4;
(..)

write(s, &mytxmsg, sizeof(mytxmsg));
```

매 전송마다 CAN 프레임 배열의 인덱스가 증가하고 인덱스 오버플로우시 0으로 설정됩니다.

#### Broadcast Manager의 수신 필터 타이머

타이머 값 `ival1`이나 `ival2`는 `RX_SETUP`시에 0이 아닌 값으로 설정할 수 있습니다. `SET_TIMER` 플래그가 설정되면 타이머는 활성화됩니다.

* `ival1`: 수신 메시지가 주어진 시간내에 다시 수신되지 않으면 `RX_TIMEOUT`을 보냅니다. `RX_SETUP`에서 `START_TIMER`가 설정되면 (이전 CAN 프레임 수신이 없더라도) 즉시 타임아웃 감지가 활성화됩니다.

* `ival2`: 수신 메시지의 비율을 ival2 값까지 줄입니다. 이는 CAN 프레임의 데이터가 상태에 따라 변경되지 않는 경우에는 메시지의 전송을 줄일 수 있어 유용합니다.

#### Broadcast Manager의 멀티플렉스 메시지 수신 필터

다중 메시지 시퀀스에서 변경된 내용을 필터링하기 위해 `RX_SETUP` 구성 메시지에 하나 이상의 CAN 프레임 배열을 전달할 수 있습니다. 첫 번째 CAN 프레임의 데이터 바이트는 후속 CAN 프레임과 일치하는 관련 비트 마스크를 포함합니다. 

만약 후속 CAN 프레임 중 하나가 해당 프레임 데이터의 비트와 일치하면, 컨텐츠를 이전에 수신된 컨텐츠와 비교합니다.

`TX_SETUP` BCM 설정 메시지에 최대 257개의 CAN 프레임(다중 필터 비트마스크 CAN 프레임 + 256 CAN 필터)을 배열로 추가할 수 있습니다.

```c
/* usually used to clear CAN frame data[] - beware of endian problems! */
#define U64_DATA(p) (*(unsigned long long*)(p)->data)

struct {
    struct bcm_msg_head msg_head;
    struct can_frame frame[5];
} msg;

msg.msg_head.opcode  = RX_SETUP;
msg.msg_head.can_id  = 0x42;
msg.msg_head.flags   = 0;
msg.msg_head.nframes = 5;
U64_DATA(&msg.frame[0]) = 0xFF00000000000000ULL; /* MUX mask */
U64_DATA(&msg.frame[1]) = 0x01000000000000FFULL; /* data mask (MUX 0x01) */
U64_DATA(&msg.frame[2]) = 0x0200FFFF000000FFULL; /* data mask (MUX 0x02) */
U64_DATA(&msg.frame[3]) = 0x330000FFFFFF0003ULL; /* data mask (MUX 0x33) */
U64_DATA(&msg.frame[4]) = 0x4F07FC0FF0000000ULL; /* data mask (MUX 0x4F) */

write(s, &msg, sizeof(msg));
```

#### Broadcast Manager의 CAN FD 지원

`CAN_BCM`의 API는 `bcm_msg_head` 구조체 뒤에 있는 `can_frame` 구조체 배열에 영향을 받습니다. CAN FD 스키마를 따르려면 `bcm_msg_head`에 `CAN_FD_FRAME` 플래그를 사용하여 뒤에 따르는 CAN 프레임의 구조가 `canfd_frame`임을 알려줍니다.

```c
struct {
    struct bcm_msg_head msg_head;
    struct canfd_frame frame[5];
} msg;

msg.msg_head.opcode  = RX_SETUP;
msg.msg_head.can_id  = 0x42;
msg.msg_head.flags   = CAN_FD_FRAME;
msg.msg_head.nframes = 5;
(..)
```

다중 필터링에서 CAN FD 프레임 사용할 때에도 MUX 마스크는 `canfd_frame` 구조체의 데이터 섹션의 처음 64비트에서 여전히 유효합니다.

### connected transport protocols (SOCK_SEQPACKET)
{:.no_toc}

### unconnected transport protocols (SOCK_DGRAM)
{:.no_toc}


## SocketCAN 코어 모듈
-------------------------

SocketCAN 코어 모듈은 `PF_CAN` 프로토콜 패밀리는 구현합니다. CAN 프로토콜 모듈은 실행시간에 코어 모듈에 의해 로딩됩니다. 코어 모듈은 CAN 프로토콜 모듈이 필요한 CAN ID에 등록하기 위한 인터페이스를 제공합니다 ([수신 목록](#수신-목록) 섹션 참조).

### `can.ko` 모듈 params

- `stats_timer`: SocketCAN 코어의 통계(예를 들어, 초당 현재/최대 프레임)를 계산하려면 기본적으로 can.ko 모듈이 시작될 때 1초 간격의 타이머를 활성화 해야 합니다. 이 타이머는 모듈 명령행에서 `stattimer=0`으로 비활성화할 수 있습니다.  
- `debug`: (SocketCAN SVN r546 부터 삭제)

### `procfs` 컨텐츠

[수신 목록](#수신-목록) 섹션에서 설명한대로 SocketCAN 코어는 수신된 CAN 프레임을 CAN 프로토콜 모듈로 전송하기 위해 몇 가지 필터를 사용합니다. 이러한 수신 목록, 해당 필터 및 필터의 일치 횟수는 해당 수신 목록에서 확인가능 합니다. 모든 항목은 장치와 프로토콜 모듈 식별자를 포함합니다:

```bash
foo@bar:~$ cat /proc/net/can/rcvlist_all

receive list 'rx_all':
  (vcan3: no entry)
  (vcan2: no entry)
  (vcan1: no entry)
  device   can_id   can_mask  function  userdata   matches  ident
   vcan0     000    00000000  f88e6370  f6c6f400         0  raw
  (any: no entry)
```

이 예제에서 어플리케이션은 vcan0로 부터 CAN 트래픽을 요청합니다.

* `rcvlist_all` - 필터링되지 않은 목록 (필터 작업 없음)
* `rcvlist_eff` - Single extended frame (EFF) 항목의 목록
* `rcvlist_err` - Error message frames 마스크 목록
* `rcvlist_fil` - 마스크/값 필터 목록
* `rcvlist_inv` - 마스크/값 필터 목록(반대)
* `rcvlist_sff` - Single standard frame (SFF) 항목의 목록

`/proc/net/can`에 있는 추가적인 procfs 명령들입니다.

* `stats`       - SocketCAN 코어 통계 (rx/tx frames, match ratios, ...)
* `reset_stats` - 수동 통계 초기화
* `version`     - SocketCAN 코어 및 ABI 버전 출력

### 자신의 CAN 프로토콜 모듈 만들기

`PF_CAN` 프로토콜 패밀리에 새로운 프로토콜을 구현하려면 [`include/linux/can.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can.h)에 새로운 프로토콜을 정의해야 합니다.
[`include/linux/core.h`](http://lxr.free-electrons.com/source/include/linux/can/core.h)를 인클루드 하여 SocketCAN의 프로토타입과 정의에 접근할 수 있습니다. CAN 프로토콜과 CAN 장치 알림 체인에 등록하는 기능과 더불어, CAN 인터페이스로부터 CAN 프레임을 수신하고 CAN 프레임을 보내는 기능이 있습니다. 

* `can_rx_register`   - 특정 인터페이스로부터 CAN 프레임을 수신
* `can_rx_unregister` - 특정 인터페이스로부터 수신하는 것을 중지
* `can_send`          - CAN 프레임 전송 (선택적 로컬 루프백)

자세한 내용은 [`net/can/af_can.c`](http://lxr.free-electrons.com/source/net/can/af_can.c)의 kerneldoc 문서나 [`net/can/raw.c`](http://lxr.free-electrons.com/source/net/can/raw.c) 또는 ['net/can/bcm.c'](http://lxr.free-electrons.com/source/net/can/bcm.c) 소스코드를 참조하세요.

## CAN 네트워크 드라이버
----------------------

CAN 네트워크 장치 드라이버를 만드는 것은 CAN character 장치 드라이버를 만드는 것 보다 훨씬 쉽습니다. 다른 네트워크 장치 드라이버와 마찬가지로 주로 다음을 내용을 처리해야 합니다:

- TX: CAN 프레임을 socket 버퍼에서 CAN 컨트롤러로 옮깁니다.
- RX: CAN 프레임을 CAN 컨트롤로에서 socket 버퍼로 옮깁니다.

[`Documentation/networking/netdevices.txt`](https://www.kernel.org/doc/Documentation/networking/netdevices.txt)를 참고하세요. CAN 네트워크 장치 드라이버를 만드는 것은 다음과 같은 차이점이 있습니다:

### 일반 설정

```c
dev->type  = ARPHRD_CAN; /* the netdevice hardware type */
dev->flags = IFF_NOARP;  /* CAN has no arp */

dev->mtu = CAN_MTU; /* sizeof(struct can_frame) -> legacy CAN interface */

or alternative, when the controller supports CAN with flexible data rate:
dev->mtu = CANFD_MTU; /* sizeof(struct canfd_frame) -> CAN FD interface */
```

`can_frame` 이나 `canfd_frame` 구조체는 `PF_CAN` 프로토콜 패밀리의 각 소켓 버퍼 (skbuff)의 페이로드입니다.

### 전송 프레임의 로컬 루프백

[SocketCAN 개념](#전송-프레임의-로컬-루프백)에서 설명한대로 CAN 네트워크 장치 드라이버는 tty 장치의 로컬 에코와 비슷하게 로컬 루프백기능을 지원해야 합니다. 이 경우 드라이버 플래그 `IFF_ECHO`는 PF_CAN 코어가 보낸 프레임(루프백)을 폴백 솔루션처럼 로컬 에코하지 않도록 설정해야 합니다:

```c
dev->flags = (IFF_NOARP | IFF_ECHO);
```

### CAN 컨트롤러 하드웨어 필터

Deep 임베디드 시스템에서 로드 인터럽트를 줄이기 위해 일부 CAN 컨트롤러는 CAN ID(s)의 필터링을 지원합니다. 이러한 하드웨어 필터는 기능은 컨트롤러마다 다르며, 다중 사용자 네트워크 환경에서는 적당하지 않습니다. 드라이버 레벨의 필터는 다중 사용자 시스템에서 모든 유저에게 영향을 줄 수 있기 때문에, CAN 컨트롤러 하드웨어 필터는 매우 특정한 목적에서만 사용합니다. PF_CAN 코어 내의 고효율 필터 세트는 각 소켓별로 다른 필터를 각각 설정할 수 있습니다. 따라서, 하드웨어 필터의 사용은 'handmade tuning on deep embedded systems' 카테고리로 이동합니다. 필자는 MPC603e @133MHz에서 4개의 SJA1000 CAN 컨트롤러를 2002년 부터 heavy bus load에도 아무 문제없이 사용 중입니다...

### 가상 CAN 드라이버 (vcan)

네트워크 루프백 장치와 마찬가지로 vcan이라고하는 가상의 로컬 CAN 인터페이스를 제공합니다. CAN의 정규화된 주소는 다음으로 구성됩니다.

- 고유한 CAN 식별자 (CAN ID)
- 이 CAN ID가 전송될 CAN 버스 (예. can0)

따라서, 일반적인 유스케이스에서 하나 이상의 가장 CAN 인터페이스가 필요합니다.

가상 CAN 인터페이스는 실제 CAN 컨트롤러 하드웨어 없이 CAN 프레임의 수발신을 지원합니다. 가상 CAN 네트워크 장치는 일반적으로 vcan0, vcan1, vcan2.. 와 같이 `vcanX`로 불립니다. 모듈로 컴파일되면 가상 CAN 드라이버는 `vcan.ko`로 불립니다.

리눅스 커널 버전 2.6.24부터 vcan 네트워크 장치를 생성하기 위한 커널 netlink 인터페이스를 지원합니다. vcan 네트워크 장치의 생성 및 삭제는 [ip(8)](http://man7.org/linux/man-pages/man8/ip.8.html) 도구를 사용합니다:

- 가상 CAN 네트워크 인터페이스 생성:
  ```bash
  $ ip link add type vcan
  ```
- 가상 CAN 네트워크 인터페이스의 이름을 'vcan42'로 생성:
  ```bash
  $ ip link add dev vcan42 type vcan
  ```
- 'vcan42' (가상 CAN) 네트워크 인터페이스 삭제:
  ```bash
  $ ip link del vcan42
  ```

### CAN 네트워크 장치 드라이버 인터페이스

CAN 네트워크 장치 드라이버 인터페이스는 CAN 네트워크 장치를 설정하고 구성하고 모니터하는 일반적인 인터페이스를 제공합니다. 그런 다음 'IPROUTE2' 유틸리티 중 'ip' 프로그램을 사용하여 netlink 인터페이스를 통해 bit-timing 파라미터를 셋팅하는 등의 CAN 장치 구성이 가능합니다. 다음 장에서는 이를 사용하는 방법에 대해 간략히 설명합니다.

또한, 인터페이스는 실제 CAN 네트워크 장치 드라이버가 사용할 공통 데이터 구조오 공통 함수를 제공합니다. SJA1000나 MSCAN 드라이버를 살펴보고 사용법을 이해하세요. 모듈의 이름은 can-dev.ko 입니다.

#### 장치 속성을 get/set 하기 위한 Netlink 인터페이스

CAN 장치는 netlink 인터페이스를 통해 구성합니다. 지원하는 netlink 메시지 타입은 [`include/linux/can/netlink.h`](http://lxr.free-electrons.com/source/include/uapi/linux/can/netlink.h)에 정의와 간략한 설명이 있습니다. 'ip' 프로그램의 CAN 링크 지원이 가능하며 다음과 같이 사용합니다: 

  - CAN 장치 속성 설정:
  ```bash
  $ ip link set can0 type can help
  Usage: ip link set DEVICE type can
      [ bitrate BITRATE [ sample-point SAMPLE-POINT] ] |
      [ tq TQ prop-seg PROP_SEG phase-seg1 PHASE-SEG1
        phase-seg2 PHASE-SEG2 [ sjw SJW ] ]

      [ dbitrate BITRATE [ dsample-point SAMPLE-POINT] ] |
      [ dtq TQ dprop-seg PROP_SEG dphase-seg1 PHASE-SEG1
        dphase-seg2 PHASE-SEG2 [ dsjw SJW ] ]

      [ loopback { on | off } ]
      [ listen-only { on | off } ]
      [ triple-sampling { on | off } ]
      [ one-shot { on | off } ]
      [ berr-reporting { on | off } ]
      [ fd { on | off } ]
      [ fd-non-iso { on | off } ]
      [ presume-ack { on | off } ]

      [ restart-ms TIME-MS ]
      [ restart ]

      Where: BITRATE       := { 1..1000000 }
             SAMPLE-POINT  := { 0.000..0.999 }
             TQ            := { NUMBER }
             PROP-SEG      := { 1..8 }
             PHASE-SEG1    := { 1..8 }
             PHASE-SEG2    := { 1..8 }
             SJW           := { 1..4 }
             RESTART-MS    := { 0 | NUMBER }
  ```

  - CAN 장치의 세부 정보 및 통계 표시:
  ```bash
  $ ip -details -statistics link show can0
  2: can0: <NOARP,UP,LOWER_UP,ECHO> mtu 16 qdisc pfifo_fast state UP qlen 10
    link/can
    can <TRIPLE-SAMPLING> state ERROR-ACTIVE restart-ms 100
    bitrate 125000 sample_point 0.875
    tq 125 prop-seg 6 phase-seg1 7 phase-seg2 2 sjw 1
    sja1000: tseg1 1..16 tseg2 1..8 sjw 1..4 brp 1..64 brp-inc 1 clock 8000000
    re-started bus-errors arbit-lost error-warn error-pass bus-off
    41         17457      0          41         42         41
    RX: bytes  packets  errors  dropped overrun mcast
    140859     17608    17457   0       0       0
    TX: bytes  packets  errors  dropped carrier collsns
    861        112      0       41      0       0
  ```

위의 출력에 대한 추가 정보:

**\<TRIPLE-SAMPLING\>**
: 선택한 CAN 컨트롤러 모드리스트를 보여줍니다: `LOOPBACK`, `LISTEN-ONLY`, or `TRIPLE-SAMPLING`.
  
**state ERROR-ACTIVE**
: CAN 컨트롤러의 현재 상태: `ERROR-ACTIVE`, `ERROR-WARNING`, `ERROR-PASSIVE`, `BUS-OFF` or `STOPPED`

**restart-ms 100**
: 자동 재시작 지연 시간. 이 값이 0이 아닌 값으로 설정되었다면, 지정된 시간(ms)동안 bus-off 상태일 경우 CAN 컨트롤러를 재시작 합니다. 이 옵션은 기본적으로 꺼져있습니다.

**bitrate 125000 sample-point 0.875**
: 실제 초당 비트 전송률과 0.000에서 0.999 사이의 sample-point를 표시합니다. 커널에서 bit-timing 파라미터 계산이 활성화되어 있다면 (CONFIG_CAN_CALC_BITTIMING=y) bit-timing은 'bitrate' 인자를 설정하여 정의할 수 있습니다.
: 옵션으로 'sample-point'를 지정할 수 있습니다. 기본적으로 CIA[^CIA] 권장 sample-point를 가정하여 0.000입니다.

**tq 125 prop-seg 6 phase-seg1 7 phase-seg2 2 sjw 1**
: Shows the time quanta in ns, propagation segment, phase buffer segment 1 and 2 and the synchronisation jump width in units of tq. They allow to define the CAN bit-timing in a hardware independent format as proposed by the Bosch CAN 2.0 spec (see chapter 8 of http://www.semiconductors.bosch.de/pdf/can2spec.pdf).

**sja1000: tseg1 1..16 tseg2 1..8 sjw 1..4 brp 1..64 brp-inc 1 clock 8000000**
: Shows the bit-timing constants of the CAN controller, here the 	"sja1000". The minimum and maximum values of the time segment 1 and 2, the synchronisation jump width in units of tq, the bitrate pre-scaler and the CAN system clock frequency in Hz.
: These constants could be used for user-defined (non-standard) bit-timing calculation algorithms in user-space.

**re-started bus-errors arbit-lost error-warn error-pass bus-off**
: Shows the number of restarts, bus and arbitration lost errors, 	and the state changes to the error-warning, error-passive and bus-off state. RX overrun errors are listed in the "overrun" field of the standard network statistics.

[^CIA]: Can in Automation

#### CAN 비트 타이밍 설정

The CAN bit-timing parameters can always be defined in a hardware independent format as proposed in the Bosch CAN 2.0 specification specifying the arguments "tq", "prop_seg", "phase_seg1", "phase_seg2" and "sjw":

```bash
$ ip link set canX type can tq 125 prop-seg 6 \
		phase-seg1 7 phase-seg2 2 sjw 1
```

If the kernel option CONFIG_CAN_CALC_BITTIMING is enabled, CIA recommended CAN bit-timing parameters will be calculated if the bit- rate is specified with the argument "bitrate":

```bash
$ ip link set canX type can bitrate 125000
```

Note that this works fine for the most common CAN controllers with standard bit-rates but may *fail* for exotic bit-rates or CAN system clock frequencies. Disabling CONFIG_CAN_CALC_BITTIMING saves some space and allows user-space tools to solely determine and set the bit-timing parameters. The CAN controller specific bit-timing constants can be used for that purpose. They are listed by the following command:

```bash
$ ip -details link show can0
...
  sja1000: clock 8000000 tseg1 1..16 tseg2 1..8 sjw 1..4 brp 1..64 brp-inc 1
```

#### CAN 네트워크 장치의 시작 및 중지

A CAN network device is started or stopped as usual with the command "ifconfig canX up/down" or "ip link set canX up/down". Be aware that you *must* define proper bit-timing parameters for real CAN devices before you can start it to avoid error-prone default settings:

```bash
$ ip link set canX up type can bitrate 125000
```

A device may enter the "bus-off" state if too many errors occurred 재on the CAN bus. Then no more messages are received or sent. An automatic bus-off recovery can be enabled by setting the "restart-ms" to a non-zero value, e.g.:

```bash
$ ip link set canX type can restart-ms 100
```

Alternatively, the application may realize the "bus-off" condition by monitoring CAN error message frames and do a restart when appropriate with the command:

```bash
$ ip link set canX type can restart
```

Note that a restart will also create a CAN error message frame (see also chapter 3.3).

### CAN FD (flexible data rate) 드라이버 지원

CAN FD capable CAN controllers support two different bitrates for the arbitration phase and the payload phase of the CAN FD frame. Therefore a second bit timing has to be specified in order to enable the CAN FD bitrate.

Additionally CAN FD capable CAN controllers support up to 64 bytes of payload. The representation of this length in can_frame.can_dlc and canfd_frame.len for userspace applications and inside the Linux network layer is a plain value from 0 .. 64 instead of the CAN 'data length code'.

The data length code was a 1:1 mapping to the payload length in the legacy CAN frames anyway. The payload length to the bus-relevant DLC mapping is only performed inside the CAN drivers, preferably with the helper functions can_dlc2len() and can_len2dlc().

The CAN netdevice driver capabilities can be distinguished by the network devices maximum transfer unit (MTU):

```
  MTU = 16 (CAN_MTU)   => sizeof(struct can_frame)   => 'legacy' CAN device
  MTU = 72 (CANFD_MTU) => sizeof(struct canfd_frame) => CAN FD capable device
```

The CAN device MTU can be retrieved e.g. with a SIOCGIFMTU ioctl() syscall.
N.B. CAN FD capable devices can also handle and send legacy CAN frames.

When configuring CAN FD capable CAN controllers an additional 'data' bitrate has to be set. This bitrate for the data phase of the CAN FD frame has to be at least the bitrate which was configured for the arbitration phase. This second bitrate is specified analogue to the first bitrate but the bitrate setting keywords for the 'data' bitrate start with 'd' e.g. dbitrate, dsample-point, dsjw or dtq and similar settings. When a data bitrate is set within the configuration process the controller option "fd on" can be specified to enable the CAN FD mode in the CAN controller. This controller option also switches the device MTU to 72 (CANFD_MTU).

The first CAN FD specification presented as whitepaper at the International CAN Conference 2012 needed to be improved for data integrity reasons.
Therefore two CAN FD implementations have to be distinguished today:

- ISO compliant:     The ISO 11898-1:2015 CAN FD implementation (default)
- non-ISO compliant: The CAN FD implementation following the 2012 whitepaper

Finally there are three types of CAN FD controllers:

1. ISO compliant (fixed)
2. non-ISO compliant (fixed, like the M_CAN IP core v3.0.1 in m_can.c)
3. ISO/non-ISO CAN FD controllers (switchable, like the PEAK PCAN-USB FD)

The current ISO/non-ISO mode is announced by the CAN controller driver via netlink and displayed by the 'ip' tool (controller option FD-NON-ISO).
The ISO/non-ISO-mode can be altered by setting 'fd-non-iso {on|off}' for switchable CAN FD controllers only.

Example configuring 500 kbit/s arbitration bitrate and 4 Mbit/s data bitrate:

```bash
$ ip link set can0 up type can bitrate 500000 sample-point 0.75 \
                               dbitrate 4000000 dsample-point 0.8 fd on
$ ip -details link show can0
5: can0: <NOARP,UP,LOWER_UP,ECHO> mtu 72 qdisc pfifo_fast state UNKNOWN \
         mode DEFAULT group default qlen 10
link/can  promiscuity 0
can <FD> state ERROR-ACTIVE (berr-counter tx 0 rx 0) restart-ms 0
      bitrate 500000 sample-point 0.750
      tq 50 prop-seg 14 phase-seg1 15 phase-seg2 10 sjw 1
      pcan_usb_pro_fd: tseg1 1..64 tseg2 1..16 sjw 1..16 brp 1..1024 \
      brp-inc 1
      dbitrate 4000000 dsample-point 0.800
      dtq 12 dprop-seg 7 dphase-seg1 8 dphase-seg2 4 dsjw 1
      pcan_usb_pro_fd: dtseg1 1..16 dtseg2 1..8 dsjw 1..4 dbrp 1..1024 \
      dbrp-inc 1
      clock 80000000
```

Example when 'fd-non-iso on' is added on this switchable CAN FD adapter:
   can <FD,FD-NON-ISO> state ERROR-ACTIVE (berr-counter tx 0 rx 0) restart-ms 0

### CAN 하드웨어 지원

Please check the "Kconfig" file in "drivers/net/can" to get an actual list of the support CAN hardware. On the SocketCAN project website (see chapter 7) there might be further drivers available, also for older kernel versions.

## SocketCAN 리소스
-----------------------

The Linux CAN / SocketCAN project resources (project site / mailing list) are referenced in the MAINTAINERS file in the Linux source tree.
Search for CAN NETWORK [LAYERS|DRIVERS].

## Credits
{:.no_toc}
----------

* Oliver Hartkopp (PF_CAN core, filters, drivers, bcm, SJA1000 driver)
* Urs Thuermann (PF_CAN core, kernel integration, socket interfaces, raw, vcan)
* Jan Kizka (RT-SocketCAN core, Socket-API reconciliation)
* Wolfgang Grandegger (RT-SocketCAN core & drivers, Raw Socket-API reviews,
                     CAN device driver interface, MSCAN driver)
* Robert Schwebel (design reviews, PTXdist integration)
* Marc Kleine-Budde (design reviews, Kernel 2.6 cleanups, drivers)
* Benedikt Spranger (reviews)
* Thomas Gleixner (LKML reviews, coding style, posting hints)
* Andrey Volkov (kernel subtree structure, ioctls, MSCAN driver)
* Matthias Brukner (first SJA1000 CAN netdevice implementation Q2/2003)
* Klaus Hitschler (PEAK driver integration)
* Uwe Koppe (CAN netdevices with PF_PACKET approach)
* Michael Schulze (driver layer loopback requirement, RT CAN drivers review)
* Pavel Pisa (Bit-timing calculation)
* Sascha Hauer (SJA1000 platform driver)
* Sebastian Haas (SJA1000 EMS PCI driver)
* Markus Plessing (SJA1000 EMS PCI driver)
* Per Dalen (SJA1000 Kvaser PCI driver)
* Sam Ravnborg (reviews, coding style, kbuild help)