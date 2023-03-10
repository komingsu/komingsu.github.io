---
title: 내가 보려고 만든, Window에서 개발환경 setup 하기 (cuda, cudnn 까지)
date: 2023-03-10
categories: [Setup, Window]
tags : [Made_for_me, window, setup]
toc: True
---





이번 내용은 개발환경을 구축을 메뉴얼할 때 제가 보려고 만들었습니다.

내용은  [노마드코더](https://nomadcoders.co/) 의 window 셋업 강의를 보고 정리하였습니다.

이후 tensorflow, cuda, cudnn은 아래 영상을 참고하였습니다.

{% include video id='hHWkvEcDBO0', provider='youtube' %}



이 window setup은 window 10을 기준으로 만들었고, 그 이전 버전에는 호환되지 않습니다.





# 1. 기본 setup



## vscode 

일단 vscode를 다운합니다. 체크박스는 전부 체크한 다음 다운을 진행하면 됩니다.



그 이후 vscode extension에서 몇 가지를 다운로드해 줍니다.

1.  python
2.  Material  Theme
3.  Material Icon Theme 



## chocolatey 다운로드

chocolatey 는 리눅스와 Mac과 같이 CLI 에서 무언갈 다운받고 하는데 효과적입니다. (예: 크롬, 7-zip, java 등등 거의 모든 것)

1. [Chocolatey Software | Installing Chocolatey](https://chocolatey.org/install) 에 들어가 줍니다.

2. Powershell 을 관리자 권한으로 켜줍니다.

3. 설치 명령어를 복사해서 붙여줍니다. 지금(2023-03-10)은 아래의 명령어 입니다.

   ```powershell
   > Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

4. Powershell을 종료한 뒤 다시 관리자 권한으로 켜준뒤 명령어로 몇가지를 다운해 줍니다.

   * choco install adobereader
   * choco install vcredist2015 ( Microsoft Visual C++ Redistributable for Visual Studio 2015 Update 3 )
   * choco install git
   * choco install winrar
   * choco install python ( 가장 최신버전이 다운됩니다. 특정 버전을 다운하려면  python38 처럼 입력 ) 
   * choco install microsoft-windows-terminal 

   

   

# WSL 

## setup

 터미널을 관리자 권한으로 켜줍니다.

1.  최신버전

   * wsl --install 을 입력합니다.

2.  구버전 (최신버전이 안될 때)

   * 터미널에 아래 명령어를 입력합니다.

     ```powershell
     dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     ```

   * 터미널에 `wsl --set-default-version 2` 를 입력합니다. ( 여기서 업데이트가 필요하면 wsl 2 커널을 다운로드 )

   * Microsoft store 에서 ubuntu 20.04 를 다운해줍니다.

   * ubuntu 를 열어주고 잠깐 기다린 뒤, 새로운 os 의 아이디, 비밀번호를 설정합니다.



## terminal customized

1. 터미널의 설정을 들어간뒤 json 파일을 열어줍니다.

   1. "defaultProfile" 부분의 값을 우분투의 id 값으로 바꿔줍니다. (아래의 list 에서 다른 설정을 바꿔도 됩니다.)

2. Ubuntu 콘솔에서 `sudo apt install zsh`를 입력하여 zsh 를 다운로드합니다.

3. Ubuntu 콘솔에서 아래 명령어를 입력합니다.

   ```ubuntu
   sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
   ```

4.  
